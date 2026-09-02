# Build and Test Summary — Balancer Sprint Planner

**Date**: 2026-09-01
**Unit**: `sprint-planner` (single unit)
**Environment**: Windows 11, Node 24, npm

## Build Status

| Item | Result |
|---|---|
| `npm install` | ✅ ~420 packages (benign `date-fns` tar warnings on Windows) |
| `npm run typecheck` (`tsc --noEmit`, strict) | ✅ **clean, exit 0** |
| `npm run build` (`vite build`) | ✅ **built in ~0.5 s** |
| Build artifacts | `web/dist/index.html`, `assets/index-*.js` (169.76 kB / 52.31 kB gzip), `assets/index-*.css` (2.72 kB / 1.02 kB gzip) |
| Server start (`npm start`) | ✅ boots on `http://localhost:4319`, serves `/api` + SPA, creates seeded `data/planner.json` |

## Test Execution Summary

### Unit + integration tests (`npm test` → Vitest)

| | Count |
|---|---|
| **Test files** | 15 passed / 15 |

> Note: since the initial "ready for Operations" sign-off, several follow-ups were made and
> re-verified: location-scoped holiday regression test, leave→Capacity reactivity test,
> QA-row highlighting, Vihidun as default Scrum Master, a **multi-file persistence rewrite**
> (per-iteration JSON files + `.ics` files in `data/`, synchronous atomic writes), and an
> **optional Jira lookup** (type an issue key → title auto-fills; `.env` config; non-blocking on
> failure) plus **Jira diagnostics** (`/api/jira/status` reports authenticated-as / the specific
> problem; wrong `JIRA_BASE_URL` and rejected credentials are told apart and explained) and
> **Capex/Opex from Jira** (task category auto-set from the Jira "Capex" field — Yes→Capex,
> else→Opex; field id resolved by name & cached). Verified live against adramatch.jira.com:
> AB-12509 → Capex, AB-12454/AB-12510 → Opex; and a **source-format Excel export** — 2 sheets
> ("Iteration &lt;n&gt;" + "Time Allocation") laid out like the original Balancer spreadsheets
> (column letters, header rows, merged group headers, live SUM formulas, per-person rows that
> reconcile); and a **Jira sprint import** — "Import from Jira" on the Iterations screen lists the
> board's sprints and creates the iteration + a task per issue (title, key, Capex/Opex, original
> estimate → Dev hours). Verified live: imported *Iteration 206* from board 27 (2 tasks, 11
> participants). Test count grew 44 → 83; `tsc` clean; build OK; live restart verified.
| **Tests** | **83 passed / 83** |
| **Failed** | 0 |
| Duration | ~3.1 s |

Breakdown:

| Suite | Tests | Status |
|---|---|---|
| `server/calc/workingDays.test.ts` | 6 | ✅ |
| `server/calc/capacityEngine.test.ts` | 8 | ✅ |
| `test/us11-iteration-205-validation.test.ts` | 4 | ✅ |
| `server/services/calendarService.test.ts` | 4 | ✅ |
| `server/services/rosterService.test.ts` | 5 | ✅ (incl. "seeds Vihidun as the default Scrum Master") |
| `server/services/iterationAllocation.test.ts` | 9 | ✅ (incl. "a Malaysia holiday reduces ONLY Malaysia-group members") |
| `server/repository/persistence.test.ts` | 3 | ✅ (calendar `.ics` file + metadata survive a restart; each iteration stored in its own `iteration-<n>.json` and reloads after restart; renaming/deleting an iteration renames/removes its file) |
| `server/services/jiraService.test.ts` | 16 | ✅ (issue lookup: key validation, not-configured, token/email trimming, summary parse, **Capex field → category**, 404 / auth-failed / bad-base-url / network mapping; **sprint import**: needs board id, lists sprints newest-first with date-only fields, maps issues → summary + Capex + estimate hours, unknown-sprint error) |
| `server/services/importService.test.ts` | 4 | ✅ (creates Iteration 206 with a task per Jira issue, estimate → Dev hours, Capex from field; rejects re-importing an existing number; uses the sprint's Jira dates; requires dates when the future sprint has none) |
| `server/services/excelExport.test.ts` | 4 | ✅ (reloads the generated `.xlsx`: sheets "Iteration &lt;n&gt;" + "Time Allocation"; header block + row-16/17 headers match the source; a person row reconciles C−Z=Remaining; Time Allocation capacity/task/buffer/Total layout + SUM formula) |
| `server/api/api.test.ts` (Supertest) | 8 | ✅ (incl. `/api/jira/status`, `/api/jira/issue/:key` → 501, `/api/iterations/import-jira` → 501 when unset) |
| `web/src/ui/kit.test.tsx` | 4 | ✅ (incl. QA-row highlight class + RoleTag) |
| `web/src/screens/RosterScreen.test.tsx` | 3 | ✅ |
| `web/src/screens/IterationsScreen.test.tsx` | 2 | ✅ (Import from Jira: selects a sprint, previews the issue count, imports and opens the iteration) |
| `web/src/screens/IterationWorkspace.test.tsx` | 3 | ✅ (leave→Capacity; Jira key auto-fills title + Capex/Opex; failed lookup keeps ID + shows note) |

### US-11 — capacity engine vs. the source spreadsheet
- **QA pool (Iteration 205)**: engine = **160.974** vs sheet **160.974** — exact.
- **Dev pool (Iteration 205)**: engine = **397.189** vs sheet **401.689**. The **4.5 h** gap is
  the single documented, accepted variance: sheet row 23 had the 5 h of meeting ceremonies
  zeroed for a full-time worker; the engine (BR-CE1) only zeroes ceremonies when leave covers
  the whole sprint. Adding those 5 h × 90 % back reproduces the sheet exactly (asserted).
- Per-row spot checks pass: Arshad 23.70725, Chamath 60.9615, SM capacity-adjusted 37.926.

### Integration — scripted end-to-end (in-process, verified during this stage)
calendar upload → create iteration (11 participants copied, SM Activity auto-added) →
half-day leave → add Common Automation (QA) → 2 tasks + Dev/QA assignment → manual Dev buffer →
`allocation()` → `.xlsx` export → cross-iteration report.

Observed output:
```
Dev pool avail/alloc/rem: 474.82 / 570.00 / -95.18
QA pool avail: 163.05
statuses: Ameerah:Over  (all others: Under)
unassigned dev/qa: 0 / 0
capex/opex: 204.1 / 92.0
xlsx bytes: 9782  (iteration-1.xlsx)
report rows: 1  (over count: 1)
```
Behaviour matches the business rules (over-allocated assignee flagged Over, others Under,
buffers counted against the pool, Capex/Opex summed).

### Performance
- `allocation()` full recompute over 11 participants + 100 assigned tasks: **~0.64 ms/call**.
- Frontend bundle: 170 kB (52 kB gzip). Local-only, single user — no load testing required (NFR-8).

### Additional test categories
| Category | Status | Notes |
|---|---|---|
| Contract tests | N/A | single process, no inter-service contracts |
| Security tests | N/A | Security Baseline extension declined; `localhost` only, no auth, no secrets |
| E2E (browser automation) | Not automated | manual walk-through documented in `integration-test-instructions.md`; UI elements carry stable `data-testid`s for future automation |
| External API (Jira) | Mocked | `jiraService.test.ts` stubs `fetch`; a real Jira call needs `.env` credentials and is verified manually |
| Property-based tests | N/A | PBT extension declined |

## Generated instruction files
- `build-instructions.md`
- `unit-test-instructions.md`
- `integration-test-instructions.md`
- `performance-test-instructions.md`
- `build-and-test-summary.md` (this file)

## Overall Status

| | |
|---|---|
| **Build** | ✅ Success |
| **Type check** | ✅ Clean |
| **All tests** | ✅ 83/83 pass |
| **Capacity engine vs spreadsheet** | ✅ within the one documented variance |
| **Ready for Operations** | ✅ Yes |

## Next Steps
All build and test activities pass. Ready to proceed to the Operations phase (currently a
placeholder — deployment for this release is simply `npm start` on the Scrum Master's machine,
documented in `README.md`).
