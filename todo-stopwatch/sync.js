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

  async function upsertKey(syncKey, value) {
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
    } catch (err) {
      log("push failed for", syncKey, err);
    }
  }

  async function pushKey(syncKey) {
    const value = pending[syncKey];
    delete pending[syncKey];
    delete timers[syncKey];
    await upsertKey(syncKey, value);
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
  // synced), the current local value is pushed up immediately so signing in
  // alone — with no further edit — is enough to seed the cloud (several of
  // these keys are only ever saved on an explicit user edit, so waiting for
  // "the next save call" could mean waiting forever).
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
      const seeds = [];
      Object.entries(LOCAL_KEY_MAP).forEach(([syncKey, localKey]) => {
        if (Object.prototype.hasOwnProperty.call(remote, syncKey)) {
          localStorage.setItem(localKey, JSON.stringify(remote[syncKey]));
        } else {
          const raw = localStorage.getItem(localKey);
          if (raw !== null) {
            try {
              seeds.push(upsertKey(syncKey, JSON.parse(raw)));
            } catch (err) {
              log("seed parse failed for", syncKey, err);
            }
          }
        }
      });
      await Promise.all(seeds);
    })();
    try {
      await syncInFlight;
    } finally {
      syncInFlight = null;
    }
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
