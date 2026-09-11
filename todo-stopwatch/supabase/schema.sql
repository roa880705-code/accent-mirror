-- やることウォッチ: multi-device sync schema.
--
-- One table, keyed by (user_id, key), holding a JSON blob per localStorage
-- key the app already uses (state, history, drafts, plans, someday,
-- dayTitles — see LOCAL_KEY_MAP in sync.js). This mirrors the existing
-- local-storage-only data model exactly instead of normalizing it into
-- separate relational tables, so the app's existing read/write code needs
-- no changes beyond calling AppSync.markDirty() after each save.
--
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New
-- query) after creating the project, before signing in from the app.

create table if not exists public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_data enable row level security;

-- Each signed-in user can only ever see or touch their own rows.
create policy "app_data_select_own" on public.app_data
  for select using (auth.uid() = user_id);

create policy "app_data_insert_own" on public.app_data
  for insert with check (auth.uid() = user_id);

create policy "app_data_update_own" on public.app_data
  for update using (auth.uid() = user_id);

create policy "app_data_delete_own" on public.app_data
  for delete using (auth.uid() = user_id);

-- Anonymous page-visit counter: sync.js silently inserts one row per
-- device per calendar day (no sign-in required), purely so the project
-- owner can see how much the deployed URL is actually being opened. No
-- select policy is defined, so the public anon key embedded in the
-- front-end can insert rows but never read them back — only the project
-- owner, via the Supabase dashboard/SQL editor (which uses the service
-- role and bypasses RLS), can see the log.
create table if not exists public.page_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  device_id text
);

alter table public.page_visits enable row level security;

create policy "page_visits_insert_anyone" on public.page_visits
  for insert with check (true);

-- Anonymous per-device usage stats: one upserted row per device_id (a
-- random id sync.js generates once and keeps in localStorage — no
-- personal info). Lets the project owner see, per device, when it was
-- first/last seen (join against page_visits' device_id + date to see how
-- many distinct days a device has come back, i.e. "continuing users") and
-- a rough count of edit actions (edit_count, pushed throttled from
-- script.js's captureUndoSnapshot() via AppSync.recordEdit()). Note the
-- update policy has no ownership check (anonymous ids can't be
-- authenticated), so this is an honor-system counter, not tamper-proof —
-- acceptable for a rough usage signal, not for anything security-sensitive.
create table if not exists public.device_stats (
  device_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  edit_count bigint not null default 0
);

alter table public.device_stats enable row level security;

create policy "device_stats_insert_anyone" on public.device_stats
  for insert with check (true);

create policy "device_stats_update_anyone" on public.device_stats
  for update using (true) with check (true);

-- 設定ページの「開発者用」パネル(sync.jsのAppSync.getDeviceStats)が
-- アクセス端末数を表示するために読み取る。ここに入っているのは端末ID
-- (匿名の乱数)・初回/最終アクセス日時・編集回数だけで個人情報は含ま
-- ないため、匿名キーからの読み取りを許可している。ただし匿名キーは
-- フロントエンドのソースに埋め込まれ誰でも読めるため、この方針は
-- 「非公開だが機密ではない集計値」という前提の上に成り立っている点に
-- 注意(page_visitsは1件ごとの生ログでノイズが多いためselectを許可
-- しておらず、プロジェクトオーナーがダッシュボード/SQL Editor経由で
-- 見る運用のまま)。
create policy "device_stats_select_anyone" on public.device_stats
  for select using (true);
