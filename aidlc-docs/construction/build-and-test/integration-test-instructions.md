# Integration Test Instructions — Balancer Sprint Planner

This is a **single-unit** application (one process: Express API + React SPA + local JSON store).
"Integration" here means the API layer ↔ services ↔ calculation ↔ repository working together,
plus the end-to-end planning workflow. No external services to stand up.

## Automated integration tests

### Already in the suite
`server/api/api.test.ts` (Supertest against the real Express app with an in-memory repository):

| Scenario | Assertion |
|---|---|
| API → RosterService → Repository | `GET /api/members` returns the 11 seed members |
| Validation propagation | `POST /api/members` with a blank name → HTTP **400**, `error: "validation_error"` |
| Not-found propagation | `GET /api/iterations/nope/capacity` → HTTP **404** |
| Full workflow | set Scrum Master → `POST /api/iterations` (participants copied, SM Activity auto-added) → `POST .../tasks` → `PUT /api/tasks/:id/assign` → `GET .../allocation` shows the assignee **Over** |
| Export | `GET /api/iterations/:id/export` → `Content-Type: …spreadsheetml…`, non-empty body |

Run: `npm test` (they run with the unit suite).

## Manual integration walk-through (smoke test)

Do this once after a build to confirm the whole stack:

### 1. Start the app
```bash
npm start
# open http://localhost:4319
```

### 2. Team & Settings
- Confirm 11 members; **Arshad** shows 70% / Additional Dev Buffer ticked.
- Select a **Scrum Master** (radio). Only one stays selected.

### 3. Holiday Calendars
- Upload a Sri Lanka `.ics` and a Malaysia `.ics`.
- Each card shows `<file> — N holidays, <min> to <max>`.
- Upload a non-`.ics` file → red toast, previous summary unchanged.

### 4. Create an iteration
- **Iterations → New iteration** → number pre-filled, start date (a Monday), end auto-suggests the Friday 3 weeks out → **Create**.
- Workspace opens on the **Leave & Participants** tab with all active members.

### 5. Capacity
- **Capacity** tab: every person shows the full breakdown; Dev pool / QA pool totals at the bottom.
- Set one person's **Leave** on the People tab to ≥ their working days → their row shows *(no ceremonies)* and Final available ≈ 0.
- Add a **Common Automation** extra assignment to a QA → that QA's Extra column increases by 30h and their Final available drops.

### 6. Tasks & allocation
- **Tasks** tab: add a task with Dev 40 / QA 20, assign Dev + QA.
- Add a task with Dev 500, assign it → **Allocation Review** shows that Dev **Over** (red); switch the assignee → both people's rows update immediately (US-15).
- "Unassigned — Dev/QA" line updates as you assign.

### 7. Manual buffers & Capex/Opex
- Capacity tab: set **Dev Buffer** 30h → the header Dev pool "left" drops by 30 and the Allocation pool `allocated` rises by 30.
- Header strip shows the Capex / Opex split.

### 8. Export & report
- Header **Export to Excel** → downloads `iteration-<n>.xlsx` with two sheets — **"Iteration &lt;n&gt;"** (the per-person capacity table, same layout as the Iteration Planning Sheet) and **"Time Allocation"** (task list + Dev/QA capacity, same layout as the Time Allocation Sheet). Open it and confirm the per-person rows reconcile and the SUM formulas recalculate.
- **Report** screen lists the iteration with its pool capacity, allocated, and Over/Under counts.

### 9. History integrity
- Change Arshad's capacity % on **Team & Settings**.
- Re-open the earlier iteration → its numbers are **unchanged** (each iteration holds its own copy).

## Reference: scripted end-to-end (already verified)
An in-process end-to-end run (calendar upload → iteration → half-day leave → Common Automation →
tasks + assignment → manual buffer → allocation → xlsx → report) was executed during Build &
Test and is captured in `build-and-test-summary.md`. To repeat it, adapt the snippet there or
rely on `api.test.ts`.

## Cleanup
Delete `data/planner.json` to reset to a fresh seeded state. No other teardown.
