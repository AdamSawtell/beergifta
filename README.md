# Beer Gifta

Small web app for the **Old Noarlunga Hotel** AFL footy tipping group: list spare Fanzo **Beer to Gift** codes, sort by soonest expiry, and claim them in one tap.

## What you get today

- **Gift a Beer:** name, 4-character code, **expiry date and time** (both required, from Fanzo), optional note. Codes are stored in **uppercase**. Past expiry date-times cannot be added.
- **Grab a Beer:** only rows whose expiry is **still in the future**; sorted by **soonest expiry first**. The list refreshes on a timer so items disappear after expiry without a manual reload. Cards highlight beers expiring within **7 days**.
- **Claim:** marks the row as claimed (still stored locally, but hidden from the list). After claim, a dialog shows the code with **copy** support.
- **Data layer:** `src/services/beerGiftService.ts` uses **localStorage** for a password-protected static site. The same module is the place to swap in **Supabase** later without rewriting the UI.

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

## Environment variables (Supabase, optional)

The app runs with **no env vars** while it uses localStorage.

When you connect Supabase (see `dev-core/guides/supabase-patterns.md`), add these in **Amplify → Environment variables** (and in a local `.env` for development):

| Variable                 | Required when using Supabase | Notes |
|--------------------------|------------------------------|--------|
| `VITE_SUPABASE_URL`      | Yes                          | Project URL from Supabase settings |
| `VITE_SUPABASE_ANON_KEY` | Yes                          | anon public key (never use the service role key in the browser) |

After you add a Supabase client, replace the bodies of `listAvailable`, `add`, and `claim` in `beerGiftService.ts` with queries or RPC calls; keep the exported method names so pages stay stable.

## AWS Amplify Hosting

This folder is a **standalone Git repo** (`git init` at this level). Point Amplify at the **repository root** (not a monorepo subfolder), so **`amplify.yml`** sits at the repo root.

1. Create an empty **GitHub** repository (for example `beer-gifta`), then from this folder run:
   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```
2. In **AWS Amplify** → **Host web app** → connect that GitHub repo and branch **`main`**.
3. Confirm the build uses **`amplify.yml`**: **`npm ci`**, **`npm run build`**, publish **`dist/`** (defaults match this file).
4. Add the same `VITE_*` variables in Amplify when you enable Supabase.
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

- `src/services/beerGiftService.ts` — data API (localStorage now; Supabase later).
- `src/pages/` — Home, Gift form, Grab list + claim dialog.
- `src/components/Layout.tsx` — shared shell, footer, responsible-use note.
- `amplify.yml` — Amplify build for this folder.

## Licence

Private project for your tipping group; no licence granted for reuse unless you add one.
