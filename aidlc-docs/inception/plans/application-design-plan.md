# Application Design Plan — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → Application Design
**Inputs**: `requirements/requirements.md`, `user-stories/stories.md`, `user-stories/personas.md`, `plans/execution-plan.md`

Application Design defines the **components, their responsibilities and interfaces, the service
layer, and the dependencies between them** — not the detailed business logic (that comes in
Functional Design).

Please answer every `[Answer]:` tag in Part B, then tell me you're done. I'll check the answers
for ambiguity, then ask for approval before generating the design artifacts.

---

## Part A — Proposed Design (for your review)

### A.1 Architecture style
A single local Node + TypeScript application:
- **Backend**: one Node process exposing a small HTTP API **and** serving the built React app,
  so the Scrum Master runs **one command** and opens **one `localhost` URL**.
- **Frontend**: React single-page app (Vite build).
- **Storage**: a single local database file in the working directory.
- No authentication, no network exposure beyond `localhost` (per Q16 / NFR-1).

### A.2 Proposed components (backend)
| Component | Responsibility |
|---|---|
| **RosterService** | CRUD for team members; enforce "exactly one Scrum Master"; hold per-person config (role, location group, capacity %, Additional Dev Buffer). |
| **CalendarService** | Store/replace the SL and Malaysia `.ics` files; parse them; expose "holiday dates for location group X in date range". |
| **WorkingDaysCalculator** | Pure logic: Mon–Fri dates in a window, minus a location's holidays, minus a person's leave → net working days & gross hours. |
| **CapacityEngine** | Pure logic: apply ceremonies, buffers, capacity %, Additional Dev Buffer per requirements §7.4 → per-person available hours; roll up Dev pool / QA pool. |
| **IterationService** | CRUD for iterations; per-person leave & overrides; clone/reopen; orchestrates a capacity recompute. |
| **TaskService** | CRUD for tasks and reserve lines; assignment of Dev/QA sides to people. |
| **AllocationService** | Compute per-person allocated vs available vs remaining, Over/Under/OK flags, unassigned-hours totals; pool-level allocation. |
| **ReportService** | Cross-iteration allocation report (planned figures). |
| **ExcelExportService** | Render an iteration (capacity + allocation + tasks + pools) to `.xlsx`. |
| **Persistence / Repository layer** | Read/write all entities to the local store; snapshot immutability for closed iterations. |
| **HTTP API layer** | Thin REST controllers mapping requests to the services above; serves the React build. |

### A.3 Proposed components (frontend)
Screens roughly one-per-story-group: Roster & Settings, Holiday Calendars, Iterations list,
Iteration workspace (capacity breakdown + tasks + assignment + allocation review + pools),
Report, plus an Export action. A shared API client and a small amount of view state.

### A.4 Data model
As per requirements §9 (TeamMember, HolidayCalendar, Iteration, IterationMember, Task,
ReserveLine, plus an optional cached CapacitySnapshot per closed iteration).

---

## Part B — Questions

## Question 1
**Storage** — how should the local data be persisted?

A) **SQLite file** (via a light library, e.g. better-sqlite3) — one `.db` file, transactional, easy to back up

B) **Plain JSON file** (via a tiny library, e.g. lowdb) — human-readable, trivially portable, no native dependency

C) No preference — you choose (I will recommend **A: SQLite** for data integrity with history)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
**Run / packaging** — how should the Scrum Master start it?

A) One command (`npm start`) that builds/serves everything on a single `localhost` port — simplest

B) Package it as a double-click executable later (adds build complexity; not needed now)

C) No preference — you choose (I will recommend **A**)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
**Historical integrity** — when the roster or holiday calendar changes, what happens to past iterations?

A) **Freeze closed iterations** — when an iteration is closed, its capacity/allocation numbers are snapshotted and never change afterwards, even if the roster or calendars change later

B) Always recompute everything live from current roster/calendars (past iterations can shift)

C) No preference — you choose (I will recommend **A: freeze on close**)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
**API layer style** between the React app and the Node backend?

A) **REST** (plain JSON endpoints) — conventional, easy to inspect

B) **tRPC** (end-to-end type-safe calls, no hand-written endpoint contracts) — nice with a TS full stack, slightly more framework

C) No preference — you choose (I will recommend **A: REST** for simplicity and transparency)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
**Third-party libraries** — are you OK adding well-established npm libraries for:
`.ics` parsing, Excel generation, the SQLite/JSON store, and a React build (Vite)?

A) Yes — use well-established libraries for these; keep the list small

B) Prefer minimal dependencies — write `.ics` parsing and Excel output by hand where feasible

C) No preference — you choose (I will recommend **A**, small vetted set)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
**UI styling** — how much visual polish for the first release?

A) Functional and clean with a lightweight UI kit (tables, forms, badges for Over/Under/OK) — no heavy design system

B) Minimal / unstyled — correctness first, styling later

C) Richer dashboard look (charts for pool utilisation, colour-coded heatmap of per-person load)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
**Component boundary check** — does the proposed component list in A.2 look right, or would you
merge/split anything?

A) Looks right as proposed

B) Merge the pure-logic pieces (WorkingDaysCalculator + CapacityEngine) into one "CalculationEngine" component

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
**Project layout** — one package or a split?

A) **Single npm package** (backend + frontend folders, one `package.json`) — simplest for one small app

B) **Two packages / npm workspaces** (`server`, `web`) — cleaner separation, a little more setup

C) No preference — you choose (I will recommend **A**)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Part C — Execution checklist (runs after you approve this plan)

- [x] C1. Finalise component list & boundaries from answers (Q7=A 11 components as proposed, Q8=A single package)
- [x] C2. Write `aidlc-docs/inception/application-design/components.md`
- [x] C3. Write `aidlc-docs/inception/application-design/component-methods.md`
- [x] C4. Write `aidlc-docs/inception/application-design/services.md`
- [x] C5. Write `aidlc-docs/inception/application-design/component-dependency.md` (matrix + Mermaid + text alternative)
- [x] C6. Write `aidlc-docs/inception/application-design/application-design.md` (consolidated, stack locked from Q1–Q8)
- [x] C7. Story-group coverage check — no blocking gaps (§7 of application-design.md)
- [x] C8. Update `aidlc-state.md`; present completion message
