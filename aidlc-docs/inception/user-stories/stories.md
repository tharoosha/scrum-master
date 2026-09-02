# User Stories — Sprint Time Allocation / Scrum Master Software

**Persona**: Scrum Master (SM) — the single persona for release 1 (see `personas.md`).
**Format**: `As a Scrum Master, I want <capability>, so that <benefit>.`
**Acceptance criteria**: Given / When / Then.
**Granularity**: medium — one story per meaningful capability.
**Priority flag**: `MVP` (needed for first usable release) or `Later`.
**Source**: `aidlc-docs/inception/requirements/requirements.md` (FR / NFR references in each story).

---

## Group 1 — Team Roster & Configuration

### US-1 — Manage team members `MVP`
**As a** Scrum Master, **I want** to maintain the list of team members and their attributes,
**so that** capacity is calculated from correct, current data. *(FR-1, FR-2)*

- **Given** the roster screen, **when** I add a member with name, role (`Dev` or `QA`), location group (`Sri Lanka` or `Malaysia`), capacity % and Additional Dev Buffer flag, **then** the member is saved and appears in the roster.
- **Given** an existing member, **when** I edit any attribute, **then** the change is saved and any open iteration's capacity recalculates.
- **Given** a member who has left, **when** I mark them inactive, **then** they are excluded from new iterations but remain visible on past iterations.
- **Given** a fresh install, **then** the roster is pre-seeded with the 11 members and attributes listed in `personas.md`.
- **Given** the add/edit form, **when** role or location group is missing, **then** the record cannot be saved and the missing field is indicated.

### US-2 — Designate the Scrum Master `MVP`
**As a** Scrum Master, **I want** exactly one member marked as the Scrum Master,
**so that** the 20h SM Activity deduction is applied to the right person. *(FR-3)*

- **Given** no SM is set, **when** I mark a member as Scrum Master, **then** that member holds the SM designation.
- **Given** a member already holds the SM designation, **when** I assign it to another member, **then** it is removed from the previous holder automatically (never two at once).
- **Given** a member holds the SM designation, **when** capacity is calculated, **then** only that member receives the 20h SM Activity deduction.

### US-3 — View calculation constants and set the allocation tolerance `MVP`
**As a** Scrum Master, **I want** to see the fixed ceremony/buffer constants and set the over/under tolerance,
**so that** I trust the math and control how strict the flags are. *(FR-4, FR-20, NFR-6)*

- **Given** the settings screen, **then** the fixed constants are displayed read-only: 7 productive h/day; Mon–Fri; Daily Scrum 0.25h/working day; Planning 1h; Grooming 2h; Retro 0.5h; Demo 1.5h; SM Activity 20h; Dev Buffer 5%; Opex/Capex buffer split as per the source sheet; capacity 70% (Arshad) / 90% (others); Additional Dev Buffer 50%.
- **Given** the settings screen, **when** I set the allocation tolerance in hours, **then** it is saved and used by the Over/Under/OK flags (default 4h).

---

## Group 2 — Holiday Calendars

### US-4 — Upload and replace holiday calendars `MVP`
**As a** Scrum Master, **I want** to upload a `.ics` file for Sri Lanka holidays and another for Malaysia holidays,
**so that** working-day counts exclude the right public holidays for each location. *(FR-6, FR-7, NFR-11)*

- **Given** the calendars screen, **when** I upload an `.ics` for a location group, **then** it is stored and a summary shows the file name, number of holiday events, and the date range covered.
- **Given** a calendar is already stored for a location, **when** I upload a new file for that location, **then** it replaces the previous one.
- **Given** an uploaded file that is not valid iCalendar, **when** I upload it, **then** it is rejected with a clear message and the previous calendar is kept.
- **Given** stored calendars, **when** I create iterations over the year, **then** the same stored calendars are reused without re-uploading. *(FR-6)*

### US-5 — Resolve holidays per person by location `MVP`
**As a** Scrum Master, **I want** each person's holidays taken from their location group's calendar,
**so that** the Malaysia team (Arshad, Meng, Ameerah) and the SL team get different working days. *(FR-8, FR-9, FR-11)*

- **Given** an iteration window, **when** working days are computed for a location, **then** the result is (Mon–Fri dates in the window) − (that location's holiday dates falling on a Mon–Fri in the window).
- **Given** a holiday that falls on a weekend, **then** it does not reduce the working-day count.
- **Given** a multi-day holiday entry, **then** each weekday it covers within the window is counted once.
- **Given** a Malaysia-group member and an SL-group member in the same iteration, **when** the two calendars differ, **then** their gross working days differ accordingly.

---

## Group 3 — Iteration Setup

### US-6 — Create and edit an iteration `MVP`
**As a** Scrum Master, **I want** to define an iteration with a number and start/end dates,
**so that** capacity and allocation are scoped to that sprint. *(FR-10, FR-13)*

- **Given** the iterations list, **when** I create an iteration with number, start date and end date, **then** it is saved with status `planning` and becomes the active iteration.
- **Given** an iteration in `planning`, **when** I edit its dates, **then** all capacity figures recalculate.
- **Given** an end date earlier than the start date, **then** the iteration cannot be saved.
- **Given** an existing iteration number, **when** I reuse it, **then** I am warned of the duplicate.

### US-7 — Record per-person leave and per-iteration overrides `MVP`
**As a** Scrum Master, **I want** to enter each person's leave days and a few per-iteration overrides,
**so that** individual availability reflects reality this sprint. *(FR-5, FR-12)*

- **Given** the active iteration, **when** I set a member's personal leave (in days), **then** their gross hours reduce by leave × 7 and their breakdown updates.
- **Given** a member who will not attend ceremonies this sprint, **when** I set "does not attend ceremonies", **then** their ceremony deduction becomes 0.
- **Given** a member with review duty, **when** I set their MAUI Review hours (default 0), **then** that value is deducted in their breakdown.
- **Given** leave greater than the iteration's working days, **then** the tool warns and clamps available hours at 0 (never negative).

### US-8 — Clone or reopen a past iteration `Later`
**As a** Scrum Master, **I want** to clone a previous iteration as the basis for a new one, or reopen a closed one read-only,
**so that** I don't re-enter the roster/leave structure each time. *(FR-13)*

- **Given** a past iteration, **when** I choose "clone", **then** a new `planning` iteration is created with the same members and override structure but zeroed leave and no tasks.
- **Given** a closed iteration, **when** I open it, **then** it is shown read-only with an explicit "reopen" action required to edit.

---

## Group 4 — Capacity Calculation

### US-9 — See each person's available-hours breakdown `MVP`
**As a** Scrum Master, **I want** a per-person breakdown of how available hours are derived,
**so that** every number is traceable and defensible. *(FR-14, FR-16, NFR-6, NFR-7)*

- **Given** the active iteration, **when** I open a member's capacity breakdown, **then** it shows each line in order: net working days (location) → personal leave → gross hours → ceremony deduction → buffer deduction → remaining → capacity-adjusted (× capacity %) → Additional Dev Buffer (× 50% if flagged) → **final available hours**.
- **Given** the formulas in requirements §7.4, **then** each displayed line equals the specified formula.
- **Example (formula-level check):** a 90%-capacity Dev with gross hours G, ceremony deduction C, buffer deduction B → final available = `(G − C − B) × 0.90`.
- **Example (Additional Dev Buffer):** Arshad at 70% with remaining R → final available = `R × 0.70 × 0.50`.
- **Given** any input change (leave, dates, roster, SM designation), **then** the breakdown updates without a manual refresh.

### US-10 — See Dev pool and QA pool totals `MVP`
**As a** Scrum Master, **I want** the aggregate Dev pool and QA pool totals,
**so that** I keep the familiar team-level view as well as the per-person one. *(FR-15, FR-24, FR-13-Q answer A)*

- **Given** the active iteration, **then** Dev pool = Σ final available hours of active Devs, and QA pool = Σ final available hours of active QAs.
- **Given** the pools are shown, **then** each also shows allocated and remaining totals.

### US-11 — Validate the engine against a historical iteration `MVP`
**As a** Scrum Master, **I want** confidence the tool reproduces the current spreadsheet,
**so that** I can trust it to replace the sheets. *(NFR-7, requirements §7.7)*

- **Given** Iteration 204 (or 205) entered with the same roster, dates, leave and calendars as the source sheet, **when** capacity is calculated, **then** the Dev pool and QA pool match the source *Iteration Planning Sheet* totals within ±0.5h.
- **Given** the validation, **then** it is covered by an automated test, not only a manual check.

---

## Group 5 — Tasks & Assignment

### US-12 — Manage tasks for an iteration `MVP`
**As a** Scrum Master, **I want** to add, edit and delete tasks with Dev and QA estimates,
**so that** the work to be allocated is captured. *(FR-17)*

- **Given** the active iteration, **when** I add a task with title, external ID (free text, e.g. `AB-12510`), Dev estimate (h), QA estimate (h) and optional category (Capex/Opex), **then** it is saved to that iteration.
- **Given** a task, **when** I edit its estimates or delete it, **then** the change is saved and affected allocations update (see US-15).
- **Given** an estimate field, **when** I enter a negative number, **then** it is rejected.
- **Given** a task, **then** either the Dev estimate or the QA estimate (or both) may be zero.

### US-13 — Assign each side of a task to a person `MVP`
**As a** Scrum Master, **I want** to assign a task's Dev work to one Dev and its QA work to one QA,
**so that** each person's load is built up from real assignments. *(FR-18, FR-19)*

- **Given** a task with a non-zero Dev estimate, **when** I assign it to a Dev, **then** that estimate counts toward that Dev's allocated hours.
- **Given** a task with a non-zero QA estimate, **when** I assign it to a QA, **then** that estimate counts toward that QA's allocated hours.
- **Given** a task, **then** either side may be left unassigned.
- **Given** the assignment control, **then** only Devs are selectable for the Dev side and only QAs for the QA side.

### US-14 — Maintain reserve/buffer lines `MVP`
**As a** Scrum Master, **I want** to record reserve lines (Dev Buffer, QA Buffer, Discussions, Move-to-backlog, Risk list),
**so that** the pool math matches the current Time Allocation Sheet. *(FR-22, requirements A5)*

- **Given** the active iteration, **when** I add a reserve line with a label, a side (Dev or QA) and hours, **then** those hours are subtracted from that pool's available total but not assigned to any individual.
- **Given** a new iteration, **then** a default set of reserve lines is pre-populated and editable.

### US-15 — Allocation reacts immediately to task changes `MVP`
**As a** Scrum Master, **I want** the affected person's allocation and flag to update the moment I change a task,
**so that** I always see the current picture while rebalancing. *(Planning Q6 = A; FR-19, FR-20)*

- **Given** an assigned task, **when** I change its Dev or QA estimate, **then** the assigned person's allocated hours, remaining hours and Over/Under/OK flag update immediately.
- **Given** an assigned task, **when** I reassign it from person A to person B, **then** both A's and B's allocated hours and flags update in the same action.
- **Given** a task, **when** I delete it, **then** any assignee's allocation is reduced accordingly.

---

## Group 6 — Allocation Review

### US-16 — Per-person allocation table with flags `MVP`
**As a** Scrum Master, **I want** a table of every person's available vs allocated vs remaining hours with a status flag,
**so that** I can see at a glance who is over- and who is under-allocated. *(FR-19, FR-20, FR-23)*

- **Given** the active iteration, **then** the table shows one row per active member with: name, role, location, available h, allocated h, remaining h, status.
- **Given** a member whose remaining hours < −tolerance, **then** status = `Over`.
- **Given** a member whose remaining hours > +tolerance, **then** status = `Under`.
- **Given** a member within ±tolerance, **then** status = `OK`.
- **Given** the table, **then** it can be sorted so `Over` and `Under` members are easy to find.

### US-17 — Surface unassigned work `MVP`
**As a** Scrum Master, **I want** to see the total Dev hours and QA hours not yet assigned to anyone,
**so that** nothing is forgotten before the sprint starts. *(FR-21)*

- **Given** the active iteration, **then** the view shows total unassigned Dev estimate hours and total unassigned QA estimate hours.
- **Given** all task sides are assigned, **then** both unassigned totals read 0.

### US-18 — Aggregate pool view alongside per-person `MVP`
**As a** Scrum Master, **I want** the Dev/QA pool summary shown on the same screen as the per-person table,
**so that** I keep both perspectives while planning. *(FR-24, Planning Q13 = A)*

- **Given** the allocation review screen, **then** the Dev pool and QA pool (available / allocated / remaining) are shown together with the per-person table.
- **Given** the pool totals, **then** available equals the sum of per-person available minus reserve lines for that side.

---

## Group 7 — History & Reporting

### US-19 — Retain and browse past iterations `MVP`
**As a** Scrum Master, **I want** every iteration kept and browsable,
**so that** I have a durable record. *(FR-13, FR-26, NFR-2)*

- **Given** several completed iterations, **when** I open the iterations list, **then** all of them are listed with number, dates and status.
- **Given** a past iteration, **when** I open it, **then** its roster snapshot, capacity, tasks and allocation are shown as they were.

### US-20 — Cross-iteration allocation report `Later`
**As a** Scrum Master, **I want** a report across iterations of pool capacity, pool allocated, and per-person over/under counts,
**so that** I can see whether planning accuracy is improving. *(FR-26; FR-27 actuals out of scope per Planning Q7 = B)*

- **Given** two or more iterations, **when** I open the report, **then** it shows per iteration: Dev/QA pool capacity, Dev/QA pool allocated, count of members flagged Over, count flagged Under.
- **Note:** actual-hours entry and planned-vs-actual comparison are **not** in the first release; this report uses planned figures only.

---

## Group 8 — Excel Export

### US-21 — Export the iteration to Excel `MVP`
**As a** Scrum Master, **I want** to export the current iteration to an `.xlsx` file,
**so that** I can share the plan with management and paste into existing sheets. *(FR-28, FR-29, NFR-1)*

- **Given** the active iteration, **when** I choose "Export to Excel", **then** an `.xlsx` file downloads containing: the per-person capacity breakdown, the per-person allocation table with flags, the task list with assignments, and the Dev/QA pool totals.
- **Given** the exported file, **then** its layout is recognisable to someone used to the current Iteration Planning and Time Allocation sheets (a capacity sheet and an allocation sheet).
- **Given** an iteration with no tasks, **then** export still succeeds with the capacity section populated.

---

## Persona → Story Map

All stories are performed by the single persona **Scrum Master**. Secondary contexts:

| Story | Also relevant to (future) |
|---|---|
| US-13, US-15, US-16 | Team Lead (assignment adjustments) |
| US-16, US-19, US-20 | Team Lead / management (review) |
| US-21 | Management (consumes the export) |
| US-16 (own row only) | Team Member (future read-only view) |

---

## Requirement Coverage Check (C9)

| Requirement | Covered by |
|---|---|
| FR-1 Roster CRUD | US-1 |
| FR-2 Seed roster | US-1 |
| FR-3 One Scrum Master | US-2 |
| FR-4 Fixed constants | US-3 |
| FR-5 Per-person overrides | US-7 |
| FR-6 / FR-7 `.ics` upload & replace | US-4 |
| FR-8 Weekend/holiday overlap | US-5 |
| FR-9 Per-location holidays | US-5 |
| FR-10 Create iteration | US-6 |
| FR-11 Net working days | US-5, US-6 |
| FR-12 Personal leave | US-7 |
| FR-13 Retain / reopen / clone | US-6, US-8, US-19 |
| FR-14 Per-person breakdown | US-9 |
| FR-15 Pools | US-10 |
| FR-16 7h day / Mon–Fri | US-9 |
| FR-17 Task CRUD | US-12 |
| FR-18 Assign Dev/QA sides | US-13 |
| FR-19 Allocated & remaining | US-13, US-15, US-16 |
| FR-20 Over/Under/OK flags | US-3 (tolerance), US-16 |
| FR-21 Unassigned hours | US-17 |
| FR-22 Reserve lines | US-14 |
| FR-23 Per-person table | US-16 |
| FR-24 Aggregate view | US-10, US-18 |
| FR-25 Task list view | US-12, US-13 |
| FR-26 Cross-iteration report | US-20 |
| FR-27 Planned vs actual | Deferred (Planning Q7 = B) — noted in US-20 |
| FR-28 / FR-29 Excel export | US-21 |
| NFR-2 Persistence | US-19 (implied), all stories |
| NFR-6 Traceable math | US-3, US-9 |
| NFR-7 Engine tests | US-9, US-11 |
| NFR-11 `.ics` parsing | US-4, US-5 |

**Gaps / deferred:** planned-vs-actual (FR-27) intentionally deferred; Team Member read-only
view deferred; Jira integration out of scope (all per earlier decisions).

---

## MVP vs Later summary

- **MVP:** US-1, US-2, US-3, US-4, US-5, US-6, US-7, US-9, US-10, US-11, US-12, US-13, US-14, US-15, US-16, US-17, US-18, US-19, US-21
- **Later:** US-8 (clone/reopen convenience), US-20 (cross-iteration report)
