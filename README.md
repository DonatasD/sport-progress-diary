# Sports Diary

A private, mobile-first diary for padel, running and gym sessions. Log how a session went,
what improved and what to work on next. Google sign-in, restricted to an email allowlist.

**Stack:** Next.js 16 (App Router, Server Actions), Tailwind v4, Supabase (Google auth + Postgres with RLS), Vercel.

## One-time setup

### 1. Supabase project (via Vercel Marketplace)

```bash
vercel integration add supabase -n sports-diary-db   # accept terms in the browser when prompted
vercel env pull .env.local
```

### 2. Database schema

Apply `supabase/migrations/20260915000000_init.sql` in the Supabase SQL editor
(Dashboard → SQL → paste → Run), or with the Supabase CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

This creates `allowed_emails`, `profiles`, `sessions`, row-level-security policies and a trigger
on `auth.users` that rejects any sign-up whose email is not in `allowed_emails`. The allowlist
starts empty, so add yourself (step 4) before signing in for the first time.

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

## Native app later

Everything the web app does goes through Supabase (auth + RLS-protected tables), so an Expo /
React Native client can use `@supabase/supabase-js` directly against the same project with
Google sign-in and the same allowlist. The app is also installable as a PWA today.
