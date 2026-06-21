-- GrowFlow — demo schema (web workstream)
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> paste -> Run.
--
-- This is a single-user demo schema: it does NOT require Supabase Auth/onboarding. A demo
-- user ("demo-user") and a pairing token ("demo") are seeded at the bottom so the extension
-- and website can talk to the same plant immediately. All access goes through the website's
-- server (service-role key), so RLS is enabled with no public policies — the anon key can't
-- read or write these tables directly.

-- The plant: one row per user. Points live here.
create table if not exists public.plants (
  user_id            text primary key,
  plant_type         text not null default 'succulent',
  growth_points      int  not null default 20,
  stage              text not null default 'sprout',
  is_dead            boolean not null default false,
  current_mood       text not null default 'locked-in',
  current_goal       text not null default 'be productive',
  last_score         int,
  last_classification text,
  last_advice        text,
  updated_at         timestamptz not null default now()
);

-- Maps an extension pairing code to a user (so the extension needs no login).
create table if not exists public.device_links (
  pairing_token text primary key,
  user_id       text not null,
  created_at    timestamptz not null default now()
);

-- Raw activity the extension uploads (audit trail / future re-scoring).
create table if not exists public.activity_events (
  id               bigint generated always as identity primary key,
  user_id          text not null,
  source           text not null default 'chrome',
  domain           text not null,
  url              text,
  title            text,
  category         text,
  started_at       timestamptz,
  duration_seconds int  not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists activity_events_user_idx
  on public.activity_events (user_id, created_at desc);

-- Lock the tables down: only the service role (the website server) may touch them.
alter table public.plants          enable row level security;
alter table public.device_links    enable row level security;
alter table public.activity_events enable row level security;

-- Seed a demo user so you can test without auth.
insert into public.plants (user_id) values ('demo-user')
  on conflict (user_id) do nothing;
insert into public.device_links (pairing_token, user_id) values ('demo', 'demo-user')
  on conflict (pairing_token) do nothing;
