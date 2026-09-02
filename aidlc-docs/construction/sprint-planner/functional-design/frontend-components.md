# Frontend Components — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Functional Design
React + Vite SPA, lightweight plain-CSS UI kit. One `localhost` URL served by the backend.
Endpoint names refer to `application-design/component-methods.md` §C11.

---

## Component tree

```
<App>
 ├─ <AppShell>                       nav + active-iteration indicator + <Toast>
 │   ├─ Roster
 │   ├─ Calendars
 │   ├─ Iterations
 │   ├─ IterationWorkspace  (when an iteration is selected)
 │   └─ Report
 └─ providers: <ActiveIterationContext>, <ToastContext>
```

Shared UI kit: `DataTable`, `StatusBadge`, `NumberField`, `TextField`, `SelectField`,
`FormRow`, `FileDrop`, `Toast`, `ConfirmDialog`, `Tabs`.

---

## Screen 1 — Roster  (US-1, US-2, US-3)

| Aspect | Detail |
|---|---|
| **Data** | `GET /api/members`, `GET /api/settings` |
| **Layout** | `DataTable` of members + a side/modal form; a "Settings" panel below |
| **Row columns** | Name, Role, Location, Capacity %, Additional Dev Buffer (✓), Scrum Master (radio), Active (toggle) |
| **Add/Edit form fields** | name (TextField, required), role (Select Dev/QA, required), locationGroup (Select SL/MY, required), capacityPercent (NumberField 1–100), additionalDevBuffer (checkbox) |
| **Scrum Master** | a single-select radio column; changing it calls `POST /api/members/:id/scrum-master`; UI shows only one selected |
| **Settings panel** | editable: defaultToleranceHours, smActivityHours, defaultMauiReviewHours, commonAutomation capex/opex, additionalDevBufferPercent; read-only: ceremony constants, buffer % table (Dev 16.5 / QA 19.5 with capex/opex split) |
| **Validation** | inline; save disabled until role + location present; capacity 1–100 |
| **Interactions** | create → `POST /api/members`; edit → `PUT /api/members/:id`; deactivate → `POST /api/members/:id/deactivate` (ConfirmDialog) |
| **State** | `members`, `settings`, `editing?: Member`, `formErrors` |

## Screen 2 — Calendars  (US-4, US-5)

| Aspect | Detail |
|---|---|
| **Data** | `GET /api/calendars` → `[{location, fileName, uploadedAt, eventCount, minDate, maxDate}]` |
| **Layout** | two cards, "Sri Lanka" and "Malaysia", each with a `FileDrop` (`.ics` only) and a summary |
| **Upload** | `POST /api/calendars/:location` (multipart); on success replace the card summary and Toast "Loaded N holidays (range …)" |
| **Errors** | invalid `.ics` → Toast error, previous summary unchanged |
| **State** | `calendars`, `uploading: {SL?: bool, MY?: bool}` |

## Screen 3 — Iterations  (US-6, US-19)

| Aspect | Detail |
|---|---|
| **Data** | `GET /api/iterations` |
| **Layout** | `DataTable`: Number, Start, End, #Participants, Dev pool, QA pool; row click → open `IterationWorkspace` |
| **Create** | "New iteration" button → form: number (NumberField, pre-filled `latest + 1`), startDate (date), endDate (date, pre-filled to the Friday 3 weeks out); `POST /api/iterations`; duplicate number → inline warning, still allowed |
| **Delete** | row action → ConfirmDialog → `DELETE /api/iterations/:id` |
| **State** | `iterations`, `creating: bool`, `form`, `formWarnings` |

## Screen 4 — IterationWorkspace  (US-7, US-9, US-10, US-12..18)  — **Tabs layout** (clarification Q11=A)

Header: iteration number, dates, tolerance (editable NumberField → `PUT /api/iterations/:id`),
"Export to Excel" button (`GET /api/iterations/:id/export` → file download), Capex/Opex summary strip.

### Tab A — Leave & Participants  (US-7)
- `DataTable` of `IterationParticipant`: Name, Role, Location, Capacity % (editable), Additional Dev Buffer (editable), Scrum Master (radio), Included (toggle), **Leave days** (NumberField, 0.5 step).
- Edits → `PUT /api/iterations/:id/members/:participantId`; on save, re-fetch capacity + allocation.
- "Extra assignments" sub-panel: list of `ExtraAssignment` (person, label, capex h, opex h); "Add MAUI Review" / "Add Common Automation" / "Add custom" buttons; SM Activity row shown read-only (follows SM). Add/edit/delete → `PUT /api/iterations/:id/members/:participantId` extra-assignment routes.

### Tab B — Capacity  (US-9, US-10, US-18)
- `GET /api/iterations/:id/capacity`.
- Per-participant expandable breakdown showing every line from `business-logic-model.md` §3.1 in order (net working days → leave → gross → ceremony → buffer → extra → remaining → capacity % → capacity-adjusted → additional dev buffer → **final available**).
- Footer: **Dev pool available**, **QA pool available**; manual **Dev Buffer h** / **QA Buffer h** NumberFields (→ `PUT /api/iterations/:id`).
- All numbers rounded to 2 dp; tooltip shows the formula.

### Tab C — Tasks  (US-12, US-13, US-14)
- `DataTable` of tasks: Title, External ID, Dev est, QA est, Category, Assigned Dev (`SelectField` of Dev participants), Assigned QA (`SelectField` of QA participants), Notes, delete.
- Inline add row; edits autosave (`POST/PUT/DELETE /api/iterations/:id/tasks`, `PUT /api/tasks/:taskId/assign`).
- After any change → re-fetch allocation (drives Tab D + the header summary) — US-15.
- Unassigned totals shown above the table: "Unassigned — Dev: X h, QA: Y h" (US-17).

### Tab D — Allocation Review  (US-16, US-17, US-18)
- `GET /api/iterations/:id/allocation`.
- `DataTable`: Name, Role, Location, Available h, Allocated h, Remaining h, **Status** (`StatusBadge` Over=red / Under=amber / OK=green). Sortable; default sort = Over first, then Under.
- Pool strip: Dev available/allocated/remaining, QA available/allocated/remaining (incl. manual buffers).
- Unassigned Dev/QA hours repeated here.

**Workspace state**: `iterationId`, `activeTab`, `capacity`, `allocation`, `tasks`,
`participants`, `extraAssignments`, `dirty` flags; a single `refresh()` re-pulls capacity +
allocation after mutations.

## Screen 5 — Report  (US-20, `Later`)

- `GET /api/report` → `DataTable`: Iteration #, Dev pool capacity, QA pool capacity,
  Dev pool allocated, QA pool allocated, # Over, # Under. Planned figures only.

---

## User-interaction flows

| Flow | Steps |
|---|---|
| **Plan an iteration** | Iterations → New → fill number/dates → opens Workspace → Tab A enter leave/extra assignments → Tab B check pools, set manual buffers → Tab C add + assign tasks → Tab D review flags, rebalance by changing assignments in Tab C → Export |
| **Rebalance** | Tab C: change a task's Assigned Dev/QA → allocation re-fetches → Tab D badges update for both people |
| **Someone goes on full leave** | Tab A: set their Leave days ≥ their working days → Tab B shows their ceremonies auto-zeroed and final available near 0 |
| **Change who does Common Automation** | Tab A extra-assignments: delete the Common Automation row, add a new one for another QA |

## Form validation rules (client, mirrored server-side)

| Field | Rule |
|---|---|
| Member name | non-empty; unique among active |
| Role / Location | required |
| capacityPercent | integer 1–100 |
| Leave days | number ≥ 0, multiple of 0.5 |
| Task estimates, buffer hours, extra-assignment hours | number ≥ 0 |
| Iteration endDate | ≥ startDate |
| Iteration number | integer ≥ 1; duplicate → warning (non-blocking) |

## API integration points (summary)

| Screen / tab | Endpoints |
|---|---|
| Roster | `GET/POST/PUT /api/members`, `POST /api/members/:id/deactivate`, `POST /api/members/:id/scrum-master`, `GET/PUT /api/settings` |
| Calendars | `GET /api/calendars`, `POST /api/calendars/:location` |
| Iterations | `GET/POST /api/iterations`, `DELETE /api/iterations/:id` |
| Workspace A | `PUT /api/iterations/:id`, `PUT /api/iterations/:id/members/:participantId`, extra-assignment add/edit/delete |
| Workspace B | `GET /api/iterations/:id/capacity`, `PUT /api/iterations/:id` (manual buffers) |
| Workspace C | `GET/POST/PUT/DELETE /api/iterations/:id/tasks`, `PUT /api/tasks/:taskId/assign` |
| Workspace D + header | `GET /api/iterations/:id/allocation` (people + unassigned + pools + capexOpexSummary) |
| Export | `GET /api/iterations/:id/export` |
| Report | `GET /api/report` |
