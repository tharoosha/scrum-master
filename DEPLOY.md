# Deploying to Vercel

The app runs two ways from the **same codebase**:

| | Storage | Auth | Command |
|---|---|---|---|
| **Local** | `./data/*.json` files | open (or set `AUTH_*`) | `npm start` |
| **Vercel** | Neon Postgres (one JSONB row) | shared password (Basic auth) | git push |

On Vercel: the React app is served as static files, and the whole Express API runs as **one
serverless function** (`api/index.ts`). Each request loads the current state from Postgres and
writes it back if anything changed.

---

## 1. Push to GitHub

```bash
cd path/to/AIDLC-training
git init
git add -A
git commit -m "Scrum Master"
```

Create an empty repo on github.com (no README/license), then:

```bash
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `data/`, `web/dist/`, and **`.env`** (your Jira
token is not committed).

## 2. Import the project into Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework Preset: **Other** (the repo has `vercel.json`, so leave the build settings as
   detected — Build Command `vite build`, Output `web/dist`).
3. Don't deploy yet — add storage and env vars first (next steps). Or deploy now and it'll fail
   until Postgres is connected; then redeploy.

## 3. Add the database (Neon Postgres)

1. In the Vercel project → **Storage** → **Create Database** → **Neon** (Postgres) → follow the
   prompts (the free tier is plenty).
2. Connect it to the project. Vercel adds `DATABASE_URL` (and `POSTGRES_URL`) to the project's
   environment automatically — the app picks either up.
3. Create the one table it needs. In the Neon dashboard → **SQL Editor** (or `psql`), run:

   ```sql
   CREATE TABLE IF NOT EXISTS planner_state (
     id INT PRIMARY KEY,
     data JSONB NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```

   (The app also creates this on first run, but doing it now avoids a race on the very first
   request.)

## 4. Set the environment variables

Vercel project → **Settings → Environment Variables** (add for **Production**, and Preview if
you want protected previews):

| Name | Value | Notes |
|---|---|---|
| `AUTH_USER` | e.g. `team` | shared login — required, or the site is public |
| `AUTH_PASS` | a strong password | |
| `JIRA_BASE_URL` | `https://adramatch.jira.com` | optional — Jira features |
| `JIRA_EMAIL` | your Atlassian email | optional |
| `JIRA_API_TOKEN` | an API token | optional |
| `JIRA_BOARD_ID` | `27` | optional — sprint import |

`DATABASE_URL` / `POSTGRES_URL` are added by the Neon integration — don't set them by hand.

## 5. Deploy

Push to `main` (or hit **Redeploy** in Vercel). Every push to `main` deploys automatically.

Open the Vercel URL — the browser will prompt for the `AUTH_USER` / `AUTH_PASS` you set. First
load seeds the 11-person roster (Vihidun as Scrum Master).

---

## How auth works

- **`middleware.ts`** (Vercel Edge) guards **everything** — the static frontend and the API —
  when `AUTH_USER` + `AUTH_PASS` are set. Anyone hitting the URL gets a Basic-auth prompt.
- **`server/api/basicAuth.ts`** does the same for the local `npm start` server if you set the
  vars in `.env`.
- With the vars unset, both are no-ops (open) — fine for a local instance.

## Notes & limits

- **Concurrency**: the whole state is one row; simultaneous edits are last-write-wins. Fine for
  a few users; don't have two people editing the same iteration at the exact same second.
- **Backup**: `SELECT data FROM planner_state WHERE id = 1;` in Neon gives you the full JSON.
- **Function timeout**: `vercel.json` sets `maxDuration: 30`s. Importing a very large Jira sprint
  could approach that on the free plan (10s) — split the sprint or bump the plan if it times out.
- **Moving local data up**: `data/planner.json` + `data/iterations/*.json` + `data/calendars/*.ics`
  hold your local data. To seed the hosted DB with it, combine them into the `DbData` shape and
  `INSERT ... INTO planner_state (id, data) VALUES (1, '<json>')`. Easiest is to just re-enter /
  re-import in the hosted app.
- **Reverting to files**: remove the Neon integration (unset `DATABASE_URL`) and the app falls
  back to `./data/` files.
