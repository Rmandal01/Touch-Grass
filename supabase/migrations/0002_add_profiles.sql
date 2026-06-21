-- GrowFlow — add the `profiles` table missing from the afgfnhtjzs… project.
--
-- This project already has plants, device_links, and activity_events; this script
-- ONLY creates the missing `profiles` table (plus its RLS policies). It
-- deliberately does NOT touch any existing table: no device_links, plants, or
-- activity_events statements appear here, so running it cannot alter or drop
-- existing data.
--
-- `create table if not exists` makes it safe to re-run. `profiles` did not exist
-- on this project, so the policies are created directly (no drops needed).

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created on first sign-in by the client.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  avatar_url          text,
  plant_type          text not null default 'succulent',
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
