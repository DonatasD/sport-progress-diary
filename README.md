# Sports Diary

A private, mobile-first diary for padel, running and gym sessions. Log how a session went,
what improved and what to work on next. Google sign-in, restricted to an email allowlist.
Optionally connects to Strava so recorded activities become sessions automatically.

**Stack:** Next.js 16 (App Router, Server Actions), Tailwind v4, Supabase (Google auth + Postgres with RLS), Vercel.

## One-time setup

### 1. Supabase project (via Vercel Marketplace)

```bash
vercel integration add supabase -n sports-diary-db   # accept terms in the browser when prompted
vercel env pull .env.local
```

### 2. Database schema

Apply the files in `supabase/migrations/` in order in the Supabase SQL editor
(Dashboard → SQL → paste → Run), or with the Supabase CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

This creates `allowed_emails`, `profiles`, `sessions`, row-level-security policies and a trigger
on `auth.users` that rejects any sign-up whose email is not in `allowed_emails`. The allowlist
starts empty, so add yourself (step 4) before signing in for the first time.
`20260919000000_strava.sql` adds `strava_connections` and the Strava columns on `sessions`.

### 3. Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → **Google**: enable, paste client ID + secret.
3. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`,
     and `https://*-<team>.vercel.app/auth/callback` for previews.

### 4. Allow people in

```sql
insert into public.allowed_emails (email, note) values ('someone@example.com', 'padel partner');
```

Emails must be lowercase. Removing a row blocks *new* sign-ups only; delete the user in
Authentication → Users to revoke an existing account.

### 5. Strava (optional)

Lets each user connect their own Strava account from **Settings**. New activities are added as
sessions through Strava webhooks, and past activities can be imported in bulk.

1. Create an API application at <https://www.strava.com/settings/api>.
   - Authorization Callback Domain: your production host (e.g. `sport-diary.donatasd.com`).
     Use `localhost` while developing.
2. Set the environment variables (Vercel → Settings → Environment Variables, and `.env.local`):

   | Variable | Value |
   | --- | --- |
   | `STRAVA_CLIENT_ID` | from the Strava app page |
   | `STRAVA_CLIENT_SECRET` | from the Strava app page |
   | `STRAVA_WEBHOOK_VERIFY_TOKEN` | any random string, e.g. `openssl rand -hex 16` |
   | `SUPABASE_SERVICE_ROLE_KEY` | already provided by the Vercel ↔ Supabase integration |

3. Deploy, then register the webhook subscription once per Strava app (it is app-wide, not per user):

   ```bash
   node scripts/strava-webhook.mjs create https://sport-diary.donatasd.com
   node scripts/strava-webhook.mjs view            # check it exists
   node scripts/strava-webhook.mjs delete <id>     # remove it
   ```

   Strava validates the URL by calling `GET /api/strava/webhook` with the verify token, so the
   deployment must be live first. Strava allows one subscription per app; point it at production
   and use the manual import while developing locally.

How activities map to sessions (`src/lib/strava/map.ts`):

- Run / TrailRun / VirtualRun → **running** (distance, avg HR, elevation; race / long / interval from
  Strava's workout type, trail for TrailRun). Duration is moving time.
- Anything whose name contains "padel", or sport type `Padel` → **padel**.
- WeightTraining / Crossfit / HIIT / Workout → **gym**.
- Everything else → **other** with the sport type as the activity name (and distance if any).
- Title ← activity name, notes ← Strava description, effort ← Strava perceived exertion (new imports only).

Webhook updates only refresh device data (time, duration, distance, HR) plus title/sport when Strava
reports those as changed; ratings and reflections are never overwritten. Deleting an activity on Strava
deletes the session unless you have written notes on it, in which case it is just unlinked. Re-running
the history import skips activities that are already in the diary.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy

```bash
vercel            # preview
vercel --prod     # production
```

## Data model

`sessions` has shared columns (sport, performed_at, duration_min, rating 1–5, effort RPE 1–10,
title, notes, improvements, next_focus) plus a `details` JSONB column validated per sport with
zod (`src/lib/types.ts`):

- **padel**: kind (match/training/americano), result, score, partner, opponents, skills[]
- **running**: kind, distance_km, avg_hr, elevation_m (pace derived from distance + duration)
- **gym**: focus, exercises[] → { name, sets[] → { reps, weight_kg } }
- **other**: activity, distance_km

`sessions.source` is `manual` or `strava`; `sessions.strava_activity_id` links imported sessions to
their Strava activity. `strava_connections` holds one OAuth token pair per user (read only via the
service role; the UI can see the athlete name, sync status and the auto-sync switch).

## Native app later

Everything the web app does goes through Supabase (auth + RLS-protected tables), so an Expo /
React Native client can use `@supabase/supabase-js` directly against the same project with
Google sign-in and the same allowlist. The app is also installable as a PWA today.
