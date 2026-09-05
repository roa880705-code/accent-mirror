// やることウォッチ: optional Google-account sync across devices, via Supabase.
//
// Fully inert until SUPABASE_URL / SUPABASE_ANON_KEY below are filled in —
// with them blank (as shipped), AppSyncReady resolves immediately and the
// app behaves exactly as it always has, local-storage only. See
// supabase/schema.sql and the setup notes in the project README for what
// to fill in and how.
(() => {
  const SUPABASE_URL = ""; // TODO: paste your Supabase project URL (Project Settings -> API)
  const SUPABASE_ANON_KEY = ""; // TODO: paste your Supabase anon/public key (same page)

  // Maps the sync table's "key" column to the localStorage key script.js
  // already reads/writes, so no other file needs to know both names.
  const LOCAL_KEY_MAP = {
    "v6": "todoStopwatch:v6",
    "history:v1": "todoStopwatch:history:v1",
    "drafts:v1": "todoStopwatch:drafts:v1",
    "plans:v1": "todoStopwatch:plans:v1",
    "someday:v1": "todoStopwatch:someday:v1",
    "dayTitles:v1": "todoStopwatch:dayTitles:v1",
  };

  // A running timer calls its save function once a second regardless of
  // whether anything actually changed (see script.js's tick interval) — so
  // pushes are throttled to at most one per key per PUSH_THROTTLE_MS,
  // trailing-edge (the latest value always wins), with a forced flush when
  // the tab is hidden/closed so nothing sits unsynced for long.
  const PUSH_THROTTLE_MS = 8000;

  const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  let client = null;
  let session = null;
  const pending = {}; // syncKey -> latest value waiting to be pushed
  const timers = {}; // syncKey -> pending setTimeout id

  function log(...args) {
    console.log("[AppSync]", ...args);
  }

  async function pushKey(syncKey) {
    const value = pending[syncKey];
    delete pending[syncKey];
    delete timers[syncKey];
    if (!client || !session || value === undefined) return;
    try {
      await client.from("app_data").upsert({
        user_id: session.user.id,
        key: syncKey,
        value,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      log("push failed for", syncKey, err);
    }
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
  // synced), local data is left alone; the app's own next save call pushes
  // it up and seeds the cloud copy from there.
  async function initialSync() {
    const remote = await pullAll();
    Object.entries(LOCAL_KEY_MAP).forEach(([syncKey, localKey]) => {
      if (Object.prototype.hasOwnProperty.call(remote, syncKey)) {
        localStorage.setItem(localKey, JSON.stringify(remote[syncKey]));
      }
    });
  }

  async function init() {
    if (!configured) return;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      pending[syncKey] = value;
      schedulePush(syncKey);
    },
    async signIn() {
      if (!client) return;
      await client.auth.signInWithOAuth({ provider: "google" });
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
