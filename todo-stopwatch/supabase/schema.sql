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

-- 個人開発ゆえの「同期バグで気づかないうちにデータが消える/変わる」
-- 不安への保険として、app_dataの内容を1日1回自動でこの
-- app_data_snapshotsへ複製し、直近90日分だけ残す。アプリ自体が同期
-- バグを持っていても影響しないよう、書き込みはアプリ(フロント)からは
-- 一切行わず、Supabase側のpg_cronだけが行う(下記のtake_app_data_
-- snapshot()参照)。読み取りは本人のみ(app_dataと同じRLS方針)。
--
-- 【既存プロジェクトへの追加手順】このブロックだけをSQL Editorへ貼って
-- 実行すればよい(schema.sql全体の再実行は、create policyがIF NOT
-- EXISTSに対応していないため「policy already exists」エラーになる)。
-- pg_cron拡張が有効化できない場合はDashboard → Database →
-- Extensions で「pg_cron」を先にオンにしてから再実行する。
create extension if not exists pg_cron;

create table if not exists public.app_data_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  -- 「その日のいつ時点か」ではなく「どの日の控えか」を表す日付。
  -- 日本時間0:05頃に走らせるジョブが、直前(=前日の終わり)の内容を
  -- その「前日」の日付として記録する設計(take_app_data_snapshot参照)。
  snapshot_date date not null,
  captured_at timestamptz not null default now()
);

create unique index if not exists app_data_snapshots_user_key_date
  on public.app_data_snapshots (user_id, key, snapshot_date);

create index if not exists app_data_snapshots_user_date
  on public.app_data_snapshots (user_id, snapshot_date);

alter table public.app_data_snapshots enable row level security;

create policy "app_data_snapshots_select_own" on public.app_data_snapshots
  for select using (auth.uid() = user_id);

-- insert/update/delete用のポリシーは意図的に置かない。この後のジョブは
-- SQL Editorと同じpostgresロール(テーブル所有者)で実行され、テーブル
-- 所有者はFORCE ROW LEVEL SECURITYを付けない限りRLSの対象外のため、
-- アプリ側(anonキー)からはこのテーブルへ一切書き込めない。

create or replace function public.take_app_data_snapshot()
returns void
language plpgsql
as $$
begin
  insert into public.app_data_snapshots (user_id, key, value, snapshot_date, captured_at)
  select user_id, key, value, (now() at time zone 'Asia/Tokyo')::date - 1, now()
  from public.app_data
  on conflict (user_id, key, snapshot_date) do update
    set value = excluded.value, captured_at = excluded.captured_at;

  delete from public.app_data_snapshots
  where snapshot_date < (now() at time zone 'Asia/Tokyo')::date - 90;
end;
$$;

-- 同じジョブ名が既にあれば一旦解除してから登録し直す(このブロックを
-- 再実行しても重複登録にならないようにするため)。日本時間0:05
-- (=UTC 15:05)に毎日実行。
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'daily_app_data_snapshot';
exception when others then
  null; -- pg_cronのジョブテーブルが無い/未初期化などは無視して先へ進む
end $$;

select cron.schedule(
  'daily_app_data_snapshot',
  '5 15 * * *',
  $$select public.take_app_data_snapshot();$$
);
