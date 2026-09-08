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

-- Anonymous page-visit counter: sync.js silently inserts one empty row per
-- browser session (no sign-in required), purely so the project owner can
-- see how much the deployed URL is actually being opened. No select policy
-- is defined, so the public anon key embedded in the front-end can insert
-- rows but never read them back — only the project owner, via the Supabase
-- dashboard/SQL editor (which uses the service role and bypasses RLS), can
-- see the log.
create table if not exists public.page_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now()
);

alter table public.page_visits enable row level security;

create policy "page_visits_insert_anyone" on public.page_visits
  for insert with check (true);
