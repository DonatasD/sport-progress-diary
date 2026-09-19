-- Sports progress diary: initial schema
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Allowlist: only these emails may create an account via Google sign-in
-- ---------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No policies on purpose: the table is only read by the trigger below (SECURITY DEFINER)
-- and managed by the project owner through the Supabase dashboard / SQL.

create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or not exists (select 1 from public.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'EMAIL_NOT_ALLOWED: % is not on the allowlist', coalesce(new.email, '<null>')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_allowed_email on auth.users;
create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created automatically)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sessions: one row per workout / match / run
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.sport as enum ('padel', 'running', 'gym', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sport        public.sport not null,
  performed_at timestamptz not null default now(),
  duration_min integer check (duration_min is null or duration_min between 1 and 1440),
  rating       smallint check (rating is null or rating between 1 and 5),      -- how did it go?
  effort       smallint check (effort is null or effort between 1 and 10),     -- RPE
  title        text,
  notes        text,          -- how the session went
  improvements text,          -- what improved
  next_focus   text,          -- what to work on next time
  details      jsonb not null default '{}'::jsonb,  -- sport-specific fields
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sessions_user_performed_idx
  on public.sessions (user_id, performed_at desc);
create index if not exists sessions_user_sport_idx
  on public.sessions (user_id, sport);

alter table public.sessions enable row level security;

create policy "sessions: read own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions: insert own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions: update own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions: delete own" on public.sessions
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();
