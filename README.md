# Scrum Master

A tool that plans sprint time **per person** for the Balancer team, replacing the
*Balancer Iteration Planning Sheet* and *Balancer Time Allocation Sheet*.

- Per-person available hours from location-aware working days − leave − ceremonies − buffers,
  × capacity % (70% Arshad / 90% others), × 50% Additional Dev Buffer for Arshad.
- Sri Lanka & Malaysia public-holiday `.ics` upload (Malaysia team = Arshad, Meng, Ameerah).
- Manual task entry + assignment; per-person **Over / Under / OK** flags; aggregate Dev/QA pools.
- Iteration history, cross-iteration report, Excel export.

> Design docs live in `aidlc-docs/`. This app was built with the AI-DLC workflow.

## Hosting

To deploy to **Vercel** (React static + the API as a serverless function, data in Neon
Postgres, protected by a shared password), see **[`DEPLOY.md`](./DEPLOY.md)**. Locally it uses
the `./data/` files described below — same code either way.

## Requirements

- Node.js 20 or newer
- Windows / macOS / Linux

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Then open **http://localhost:4319**. (Set `PORT` to change it.)

`npm start` builds the React app (`web/dist`) and starts the server, which serves both the UI
and the `/api`.

### Where your data lives — the `data/` folder

```
data/
├── planner.json                   # team roster, settings, holiday-calendar metadata
├── calendars/
│   ├── SL.ics                     # the Sri Lanka holiday file you uploaded
│   └── MY.ics                     # the Malaysia holiday file you uploaded
└── iterations/
    ├── iteration-205.json         # one file per iteration, named by its number
    └── iteration-206.json
```

Everything is plain text and written **synchronously and atomically** after every change, so
nothing is lost if you stop the server. Copy the whole `data/` folder to back up or move your
setup; copy a single `iteration-*.json` to share one sprint. Created automatically on first
run, pre-seeded with the 11-person roster (Vihidun as Scrum Master).

### Optional: auto-fill task titles from Jira

When adding a task, type the Jira issue key (e.g. `AB-12510`) in the **ID** box and tab out —
the **Title** and the **Capex/Opex** category are filled in from Jira automatically. (The
category comes from Jira's **"Capex"** field: `Yes` → Capex, `No`/blank → Opex.) If Jira isn't
set up, or the lookup fails, the ID stays and you type the details yourself (a small note
explains why).

### Optional: import a whole sprint from Jira

On the **Iterations** screen, **Import from Jira** lists your board's sprints. Pick one (e.g.
*Iteration 206*), confirm the dates, and it creates the iteration with a task per Jira issue —
title, key, Capex/Opex, and the original estimate (imported as Dev hours; split Dev/QA in the
workspace). The iteration number comes from the sprint name.

### Setup (both features)

Copy `.env.example` to `.env` and fill in:

```
JIRA_BASE_URL=https://adramatch.jira.com   # the exact host in your browser's address bar
JIRA_EMAIL=you@adra.com
JIRA_API_TOKEN=...        # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_BOARD_ID=27          # the number in your board URL (.../boards/27/backlog) — for sprint import
```

Then `npm start`. On startup the console prints `Jira lookup: enabled — authenticated as <name>`
if it worked, or the specific problem if not (wrong URL / bad credentials / missing board).
The `.env` file is git-ignored and never shown in the app.

### Development

```bash
npm run dev        # Vite on :5173 (proxying /api) + server on :4319, both with reload
```

## First-time setup in the app

1. **Team & Settings** — check the roster. **Vihidun** is the default Scrum Master; reassign it if needed.
2. **Holiday Calendars** — upload the Sri Lanka and Malaysia `.ics` files (kept until replaced).
3. **Iterations → New iteration** — enter the number (auto-filled) and Mon–Fri dates.
4. In the iteration: **Leave & Participants** → enter leave and extra assignments;
   **Capacity** → review pools, set manual Dev/QA buffers; **Tasks** → add and assign tasks;
   **Allocation Review** → check the Over/Under flags and rebalance.
5. **Export to Excel** from the iteration header — produces a 2-sheet workbook
   (`iteration-<n>.xlsx`) laid out like the original *Iteration Planning* and *Time Allocation*
   sheets, with live SUM formulas.

## Tests

```bash
npm test          # vitest: server unit + integration, web component tests, US-11 validation
npm run typecheck
```

Key test: `test/us11-iteration-205-validation.test.ts` checks the capacity engine reproduces
the source spreadsheet's Iteration 205 Dev/QA pool totals (see the file header for the one
documented historical variance).
