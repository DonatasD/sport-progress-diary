-- Strava integration: per-user OAuth connection + link from sessions to Strava activities
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

-- ---------------------------------------------------------------------------
-- One Strava athlete per user. Tokens are only ever read server-side with the
-- service-role key (webhooks arrive without a user session), so there are no
-- insert/update policies for authenticated users.
-- ---------------------------------------------------------------------------
create table if not exists public.strava_connections (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  athlete_id     bigint not null unique,
  athlete_name   text,
  athlete_avatar text,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  scope          text,
  auto_sync      boolean not null default true,   -- import new activities from webhooks
  connected_at   timestamptz not null default now(),
  last_sync_at   timestamptz,
  last_error     text
);

alter table public.strava_connections enable row level security;

create policy "strava_connections: read own" on public.strava_connections
  for select using (auth.uid() = user_id);
create policy "strava_connections: delete own" on public.strava_connections
  for delete using (auth.uid() = user_id);
create policy "strava_connections: update own" on public.strava_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Hide token columns from the anon/authenticated roles; the UI reads through
-- this grant, the server uses the service role which bypasses column grants.
revoke all on public.strava_connections from anon, authenticated;
grant select (user_id, athlete_id, athlete_name, athlete_avatar, scope, auto_sync,
              connected_at, last_sync_at, last_error, expires_at)
  on public.strava_connections to authenticated;
grant update (auto_sync) on public.strava_connections to authenticated;
grant delete on public.strava_connections to authenticated;

-- ---------------------------------------------------------------------------
-- Sessions imported from Strava remember their activity id so that webhook
-- updates and repeated history imports are idempotent.
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'strava')),
  add column if not exists strava_activity_id bigint;

create unique index if not exists sessions_strava_activity_idx
  on public.sessions (strava_activity_id)
  where strava_activity_id is not null;
