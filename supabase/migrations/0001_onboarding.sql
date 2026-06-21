-- GrowFlow — onboarding & auth schema.
--
-- Covers the tables the single-user onboarding/OAuth slice reads and writes:
-- profiles, device_links, and mood_sessions. Row Level Security is on; users
-- can only see and modify their own rows. Later migrations add scores, plants,
-- activity_events, and the deferred garden tables.

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

-- Users may read, create, and update only their own profile row.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- device_links: pairing tokens that let the Chrome extension authenticate
-- activity uploads without a full OAuth flow.
-- ---------------------------------------------------------------------------
create table if not exists public.device_links (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  pairing_token text not null unique,
  label         text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

alter table public.device_links enable row level security;

-- Users manage only their own device links. (The ingest Edge Function uses the
-- service role to resolve tokens, bypassing RLS.)
create policy "device_links_select_own" on public.device_links
  for select using (auth.uid() = user_id);
create policy "device_links_insert_own" on public.device_links
  for insert with check (auth.uid() = user_id);
create policy "device_links_delete_own" on public.device_links
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- mood_sessions: the user's mood/goal/task. The row with is_active = true is
-- the current context Claude is told about when scoring.
-- ---------------------------------------------------------------------------
create table if not exists public.mood_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mood       text not null,
  goal       text,
  is_active  boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);

alter table public.mood_sessions enable row level security;

create policy "mood_sessions_select_own" on public.mood_sessions
  for select using (auth.uid() = user_id);
create policy "mood_sessions_insert_own" on public.mood_sessions
  for insert with check (auth.uid() = user_id);
create policy "mood_sessions_update_own" on public.mood_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- At most one active mood session per user.
create unique index if not exists mood_sessions_one_active_per_user
  on public.mood_sessions (user_id)
  where is_active;
