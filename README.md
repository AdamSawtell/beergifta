# Beer Gifta

Small web app for the **Old Noarlunga Hotel** AFL footy tipping group: list spare Fanzo **Beer to Gift** codes, sort by soonest expiry, and claim them in one tap.

## Shared board (Supabase)

For **one list every device can see**, the app uses **Supabase** (Postgres + Row Level Security). Production builds **require** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If they are missing after deploy, the app shows a short configuration screen instead of the UI.

**One-time database setup**

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor** → **New query**, paste and run each migration in order:
   - **`supabase/migrations/20260110120000_beer_gifts.sql`** (table and RLS)
   - **`supabase/migrations/20260110140000_claim_beer_gift_rpc.sql`** (claim RPC; needed so **Claim beer** works with RLS)  
   You should see table **`public.beer_gifts`** under **Table Editor**. If the RPC does not show in the API tab, use **Settings → API → Reload schema** (wording may vary).
3. Open **Project Settings → API** and copy **Project URL** and the **`anon` `public`** key (never put the **service_role** key in the browser or in Amplify for this app).

**Amplify**

4. In your Amplify app: **Environment variables** → add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** with those values → save → **Redeploy** the app (Vite bakes env in at build time).

**Local dev without Supabase**

If the two `VITE_*` variables are not set, the app falls back to **localStorage** (data only on that browser). That is fine for layout checks; it is **not** a shared board.

Copy **`.env.example`** to **`.env.local`** and fill real values for shared testing on your machine.

## What you get today

- **Gift a Beer:** name, 4-character code, **expiry date and time** (both required, from Fanzo), optional note. Codes are stored in **uppercase**. Past expiry date-times cannot be added.
- **Grab a Beer:** only rows whose expiry is **still in the future**; sorted by **soonest expiry first**. The list refreshes on a timer so items disappear after expiry without a manual reload. Cards show **Expiring soon** only when expiry is within the **next 24 hours**.
- **Claim:** marks the row as claimed in the database (hidden from the available list). After claim, a dialog shows the code with **copy** support.
- **Data layer:** `src/services/beerGiftService.ts` talks to **Supabase** when env vars exist; otherwise **localStorage** for solo dev. See `dev-core/guides/supabase-patterns.md` in your workspace for wider conventions.

## Requirements

- **Node.js 20+** (matches other Amplify frontends in your workspace).

## Local development

```bash
cd beer-gifter
npm ci
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command        | Purpose                          |
|----------------|----------------------------------|
| `npm run dev`  | Vite dev server with hot reload   |
| `npm run build`| Typecheck (`tsc`) + production bundle |
| `npm run preview` | Serve the `dist/` folder locally |
| `npm run lint` | ESLint on `src/`                 |

## Environment variables

| Variable                  | Production | Local dev |
|---------------------------|------------|-----------|
| `VITE_SUPABASE_URL`       | Required   | Optional in `.env.local` |
| `VITE_SUPABASE_ANON_KEY`  | Required   | Optional in `.env.local` |

Never expose the **service_role** key in the front end or in Amplify env vars for this app.

## AWS Amplify Hosting

This folder is a **standalone Git repo** (`git init` at this level). Point Amplify at the **repository root** (not a monorepo subfolder), so **`amplify.yml`** sits at the repo root.

1. Create an empty **GitHub** repository (for example `beer-gifta`), then from this folder run:
   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```
2. In **AWS Amplify** → **Host web app** → connect that GitHub repo and branch **`main`**.
3. Confirm the build uses **`amplify.yml`**: **`npm ci`**, **`npm run build`**, publish **`dist/`** (defaults match this file).
4. Add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**, then **redeploy** so the client bundle includes them.
5. **SPA routing:** this app uses client routes (`/gift`, `/grab`). In Amplify **Rewrites and redirects**, add a rule so unknown paths serve **`/index.html`** with HTTP **200** (rewrite). Exact UI wording varies by console version; the goal is: refresh on `/gift` still loads the app. See `dev-core/guides/aws-and-hosting.md`.

Site access control (password on the Amplify app) stays outside this repo, as you described.

## Testing

This repo does not ship automated tests yet. Before handoff or merge, run:

```bash
npm ci
npm run lint
npm run build
```

See `dev-core/guides/testing-framework.md` in the parent workspace for the wider rule set.

## Project layout

- `supabase/migrations/` — SQL to create `beer_gifts` and RLS (run in Supabase SQL editor).
- `src/lib/supabase.ts` — browser Supabase client.
- `src/services/beerGiftService.ts` — `listAvailable`, `add`, `claim`.
- `src/pages/` — Home, Gift form, Grab list + claim dialog.
- `src/components/Layout.tsx` — shared shell, footer, responsible-use note.
- `amplify.yml` — Amplify build for this folder.

## Licence

Private project for your tipping group; no licence granted for reuse unless you add one.
