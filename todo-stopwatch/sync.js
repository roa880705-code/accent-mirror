// やることウォッチ: optional Google-account sync across devices, via Supabase.
//
// Fully inert until SUPABASE_URL / SUPABASE_ANON_KEY below are filled in —
// with them blank (as shipped), AppSyncReady resolves immediately and the
// app behaves exactly as it always has, local-storage only. See
// supabase/schema.sql and the setup notes in the project README for what
// to fill in and how.
(() => {
  const SUPABASE_URL = "https://nfwjtyfiljkbchwdybep.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md2p0eWZpbGprYmNod2R5YmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDMxODgsImV4cCI6MjEwNDE3OTE4OH0.c6FQylm8D7BqrD4Nu_xqFzcpgT4RUOXOXl4ZjAM9Ng0";

  // Maps the sync table's "key" column to the localStorage key script.js
  // already reads/writes, so no other file needs to know both names.
  const LOCAL_KEY_MAP = {
    "v6": "todoStopwatch:v6",
    "history:v1": "todoStopwatch:history:v1",
    "drafts:v1": "todoStopwatch:drafts:v1",
    "plans:v1": "todoStopwatch:plans:v1",
    "someday:v1": "todoStopwatch:someday:v1",
    "dayTitles:v1": "todoStopwatch:dayTitles:v1",
    "briefingMemo:v1": "todoStopwatch:briefingMemo:v1",
    "dailyNotes:v1": "todoStopwatch:dailyNotes:v1",
    "priorityTasks:v1": "todoStopwatch:priorityTasks:v1",
    "timetable:v1": "todoStopwatch:timetable:v1",
    "periodSettings:v1": "todoStopwatch:periodSettings:v1",
    "calendarHourRange:v1": "todoStopwatch:calendarHourRange:v1",
    "thisWeekTasks:v1": "todoStopwatch:thisWeekTasks:v1",
    "displaySettings:v1": "todoStopwatch:displaySettings:v1",
  };

  // A running timer calls its save function once a second regardless of
  // whether anything actually changed (see script.js's tick interval) — so
  // pushes are throttled to at most one per key per PUSH_THROTTLE_MS,
  // trailing-edge (the latest value always wins), with a forced flush when
  // the tab is hidden/closed so nothing sits unsynced for long.
  const PUSH_THROTTLE_MS = 8000;

  // Tracks, per key, the local time of the last edit (editedAt) versus the
  // last time we know this device's copy matched the server (syncedAt) —
  // written synchronously to localStorage so it survives an immediate
  // refresh, even though the actual push is throttled/async. Without this, a
  // boot-time initialSync() has no way to tell "local is newer, don't
  // overwrite it" from "local is stale, cloud should win", and a refresh
  // within the throttle window (or a push cut off by navigation) would
  // silently discard the not-yet-pushed edit.
  const SYNC_META_KEY = "todoStopwatch:syncMeta:v1";

  function loadMeta() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_META_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveMeta(meta) {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  }

  function markEdited(syncKey) {
    const meta = loadMeta();
    meta[syncKey] = { ...meta[syncKey], editedAt: Date.now() };
    saveMeta(meta);
  }

  // `atLeast` pins syncedAt to the specific edit this push/pull actually
  // covers (not "now") — otherwise a push that was already in flight when a
  // newer edit landed would, on completing, mark the NEWER edit as synced
  // too, even though only the older value made it to the server.
  function markSynced(syncKey, atLeast) {
    const meta = loadMeta();
    const prevSyncedAt = (meta[syncKey] && meta[syncKey].syncedAt) || 0;
    const ts = atLeast != null ? atLeast : Date.now();
    meta[syncKey] = { ...meta[syncKey], syncedAt: Math.max(prevSyncedAt, ts) };
    saveMeta(meta);
  }

  function hasUnsyncedLocalEdit(syncKey) {
    const entry = loadMeta()[syncKey];
    if (!entry || !entry.editedAt) return false;
    return !entry.syncedAt || entry.editedAt > entry.syncedAt;
  }

  const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  let client = null;
  let session = null;
  const pending = {}; // syncKey -> latest value waiting to be pushed
  const timers = {}; // syncKey -> pending setTimeout id
  // markDirty(syncKey, value)へ最後に渡した値のJSON文字列 — 中身が前回と
  // 同一なら「編集」として扱わない(下記参照)ためのキャッシュ。
  const lastMarkedJson = {};

  function log(...args) {
    console.log("[AppSync]", ...args);
  }

  async function upsertKey(syncKey, value, editedAtSnapshot) {
    if (!client || !session || value === undefined) return;
    try {
      // supabase-js resolves this even on a server-side rejection (e.g. an
      // RLS policy violation) rather than throwing — the failure only shows
      // up in the returned `error`, never as a caught exception.
      const { error } = await client.from("app_data").upsert({
        user_id: session.user.id,
        key: syncKey,
        value,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      markSynced(syncKey, editedAtSnapshot);
    } catch (err) {
      log("push failed for", syncKey, err);
    }
  }

  async function pushKey(syncKey) {
    const value = pending[syncKey];
    const editedAtSnapshot = (loadMeta()[syncKey] || {}).editedAt;
    delete pending[syncKey];
    delete timers[syncKey];
    await upsertKey(syncKey, value, editedAtSnapshot);
  }

  function schedulePush(syncKey) {
    if (timers[syncKey]) return; // a push is already queued; it'll pick up the latest pending[syncKey] when it fires
    timers[syncKey] = setTimeout(() => pushKey(syncKey), PUSH_THROTTLE_MS);
  }

  function flushAll() {
    Object.keys(pending).forEach((syncKey) => {
      if (timers[syncKey]) {
        clearTimeout(timers[syncKey]);
        delete timers[syncKey];
      }
      pushKey(syncKey);
    });
    if (editPushTimer) {
      clearTimeout(editPushTimer);
      pushEditCount();
    }
  }

  async function pullAll() {
    if (!client || !session) return {};
    try {
      const { data, error } = await client.from("app_data").select("key, value").eq("user_id", session.user.id);
      if (error) throw error;
      const out = {};
      (data || []).forEach((row) => {
        out[row.key] = row.value;
      });
      return out;
    } catch (err) {
      log("pull failed", err);
      return {};
    }
  }

  // On sign-in, the cloud copy (if any) wins over whatever happens to be
  // sitting in THIS browser's localStorage — the common case is signing in
  // on a second/new device that has no meaningful local data yet. If the
  // cloud has nothing for a given key (first time this account has ever
  // synced), the current local value is pushed up immediately so signing in
  // alone — with no further edit — is enough to seed the cloud (several of
  // these keys are only ever saved on an explicit user edit, so waiting for
  // "the next save call" could mean waiting forever).
  //
  // This same function also runs on every ordinary boot of an already
  // signed-in device (see init() below), where "cloud wins" is the wrong
  // default: if this device has a local edit that hasn't been confirmed
  // pushed yet (hasUnsyncedLocalEdit), pulling remote here would silently
  // discard it — e.g. an edit followed by an immediate refresh, before the
  // throttled push fires. So for any key with an unsynced local edit, this
  // device's copy wins instead and is pushed up, same as the "cloud has
  // nothing yet" case.
  //
  // Guards against overlapping calls — onAuthStateChange can fire more than
  // once for what is effectively the same sign-in (e.g. an immediate
  // INITIAL_SESSION event alongside the explicit check in init()), and
  // without this guard each overlapping call independently sees the same
  // "cloud has nothing for this key yet" snapshot and re-seeds it.
  let syncInFlight = null;

  async function initialSync() {
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      const remote = await pullAll();
      const pushes = [];
      Object.entries(LOCAL_KEY_MAP).forEach(([syncKey, localKey]) => {
        const remoteHasKey = Object.prototype.hasOwnProperty.call(remote, syncKey);
        if (remoteHasKey && !hasUnsyncedLocalEdit(syncKey)) {
          const json = JSON.stringify(remote[syncKey]);
          localStorage.setItem(localKey, json);
          markSynced(syncKey, Date.now());
          // この値を「直近でmarkDirtyに渡された値」として覚えておく —
          // 直後に始まる毎秒の自動保存(script.jsのsetInterval)が同じ値で
          // markDirtyを呼んでも「編集扱い」にならないようにするため
          // (下のmarkDirty参照)。
          lastMarkedJson[syncKey] = json;
        } else {
          const raw = localStorage.getItem(localKey);
          if (raw !== null) {
            try {
              const editedAtSnapshot = (loadMeta()[syncKey] || {}).editedAt;
              pushes.push(upsertKey(syncKey, JSON.parse(raw), editedAtSnapshot));
              lastMarkedJson[syncKey] = raw;
            } catch (err) {
              log("seed parse failed for", syncKey, err);
            }
          }
        }
      });
      await Promise.all(pushes);
    })();
    try {
      await syncInFlight;
    } finally {
      syncInFlight = null;
    }
  }

  // 匿名の端末ID: サインイン不要で「継続利用(何日にまたがって開いたか)」
  // や「編集した数」を端末ごとに紐付けて把握するための、localStorageに
  // 一度だけ生成して保存するランダムID(個人情報は含まない)。
  const DEVICE_ID_KEY = "todoStopwatch:deviceId:v1";
  function getOrCreateDeviceId() {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return null;
    }
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // アクセス数・継続利用状況の把握用に、サインインの有無を問わず、この
  // 端末で「日付が変わって初めて開いた時」だけpage_visitsへ1行記録し、
  // device_stats(端末ごとの初回/最終アクセス日時)も更新する(誰が開いた
  // かは分からない匿名カウント、端末ごとのdevice_idだけ紐付く)。タブを
  // 閉じずに日をまたいで開きっぱなしにするケースにも対応できるよう、
  // 起動時だけでなくINTERVALでも日付が変わっていないか確認する。
  // 失敗しても画面には一切影響させない。
  const VISIT_DATE_KEY = "todoStopwatch:visitLoggedDate:v1";
  const VISIT_RECHECK_MS = 15 * 60 * 1000;
  function logVisitIfNewDay() {
    try {
      const today = todayStr();
      if (localStorage.getItem(VISIT_DATE_KEY) === today) return;
      localStorage.setItem(VISIT_DATE_KEY, today);
      const deviceId = getOrCreateDeviceId();
      const now = new Date().toISOString();
      client.from("page_visits").insert({ device_id: deviceId }).then(({ error }) => {
        if (error) log("visit log failed", error);
      });
      client.from("device_stats").upsert({ device_id: deviceId, last_seen: now }, { onConflict: "device_id" }).then(({ error }) => {
        if (error) log("device_stats upsert failed", error);
      });
    } catch (err) {
      log("visit log failed", err);
    }
  }

  // 「編集した数」の把握用: script.jsのcaptureUndoSnapshot()(実質的な
  // ユーザー操作のたびに呼ばれる、undo用のスナップショット取得)から
  // window.AppSync.recordEdit()経由で呼ばれるカウンター。1秒おきに動く
  // タイマーの自動保存では呼ばれないため、実際の編集操作の回数に近い値に
  // なる。ローカルの累計値をlocalStorageに保持し、Supabaseへの反映は
  // EDIT_PUSH_THROTTLE_MSごとに間引いて送る(1編集ごとに通信しない)。
  const EDIT_COUNT_KEY = "todoStopwatch:editCount:v1";
  const EDIT_PUSH_THROTTLE_MS = 8000;
  let editPushTimer = null;
  function pushEditCount() {
    editPushTimer = null;
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;
    const count = Number(localStorage.getItem(EDIT_COUNT_KEY) || 0);
    client.from("device_stats").upsert({ device_id: deviceId, edit_count: count, last_seen: new Date().toISOString() }, { onConflict: "device_id" }).then(({ error }) => {
      if (error) log("edit count push failed", error);
    });
  }
  function recordEdit() {
    if (!configured) return;
    try {
      const count = Number(localStorage.getItem(EDIT_COUNT_KEY) || 0) + 1;
      localStorage.setItem(EDIT_COUNT_KEY, String(count));
      if (!editPushTimer) editPushTimer = setTimeout(pushEditCount, EDIT_PUSH_THROTTLE_MS);
    } catch (err) {
      log("edit count record failed", err);
    }
  }

  async function init() {
    if (!configured) return;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    logVisitIfNewDay();
    setInterval(logVisitIfNewDay, VISIT_RECHECK_MS);
    const { data } = await client.auth.getSession();
    session = data.session;
    if (session) await initialSync();

    client.auth.onAuthStateChange(async (_event, newSession) => {
      const wasSignedIn = !!session;
      const isSignedIn = !!newSession;
      session = newSession;
      if (!wasSignedIn && isSignedIn) {
        // just signed in (fresh sign-in, or a redirect back from Google) —
        // pull first, then reload so every module re-reads the merged
        // localStorage from a clean boot instead of drifting mid-session
        await initialSync();
        location.reload();
      }
    });
  }

  const ready = init().catch((err) => log("init failed", err));

  window.AppSyncReady = ready;
  window.AppSync = {
    isConfigured: () => configured,
    isSignedIn: () => !!session,
    userEmail: () => (session && session.user && session.user.email) || null,
    // Call after every localStorage.setItem for one of the six keys above —
    // a no-op when sync isn't configured or no one is signed in.
    markDirty(syncKey, value) {
      if (!configured || !session) return;
      // script.js は実行中タイマーの有無に関わらず毎秒1回save*()を呼ぶ
      // (クラッシュ時の保険)ため、ここで中身が前回と全く同じ(=本当は
      // 何も変わっていない)呼び出しを弾かないと、「編集した」印
      // (editedAt)が実質ずっと更新され続けてしまう。その状態だと、次に
      // この端末を開いた時にinitialSync()が「まだ端末側の編集がpushし
      // 切れていない」と誤認してクラウド側の最新値を取り込まず、代わりに
      // この端末の(他の端末での更新を知らない)古いローカル値でクラウドを
      // 上書きしてしまい、結果的に別端末で追加したはずの最優先/今日中
      // タスクなどが同期されず消えたように見える不具合の原因だった。
      let json;
      try {
        json = JSON.stringify(value);
      } catch {
        json = undefined; // couldn't stringify — fall through and mark dirty as before
      }
      if (json !== undefined) {
        if (lastMarkedJson[syncKey] === json) return; // 前回と同一 — 実質無変更
        lastMarkedJson[syncKey] = json;
      }
      markEdited(syncKey);
      pending[syncKey] = value;
      schedulePush(syncKey);
    },
    // 「編集した数」カウンター用 — captureUndoSnapshot()から呼ばれる。
    // サインインの有無を問わず有効(configuredであれば動く)。
    recordEdit,
    // 設定ページ「開発者用」パネル用: 匿名のdevice_statsを全件取得する。
    // device_stats自体は匿名(auth不要)のテーブルなので、サインインして
    // いなくても(client自体さえ生成されていれば)動く。個人情報を含まない
    // 集計値のみを返す想定。
    async getDeviceStats() {
      if (!configured || !client) return null;
      try {
        const { data, error } = await client
          .from("device_stats")
          .select("device_id, first_seen, last_seen, edit_count")
          .order("last_seen", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        log("device stats fetch failed", err);
        return null;
      }
    },
    async signIn() {
      if (!client) return;
      // without this, Supabase falls back to the bare origin (no path) as
      // the post-login redirect target, landing on a 404 for a project
      // page like this one (served from /accent-mirror/todo-stopwatch/,
      // not the domain root)
      await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
    },
    async signOut() {
      if (!client) return;
      flushAll();
      await client.auth.signOut();
      session = null;
      location.reload();
    },
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  window.addEventListener("beforeunload", flushAll);
})();
