# Components — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → Application Design
**Scope**: high-level component identification, responsibilities, and interfaces.
Detailed business rules are defined later in Functional Design.

## Locked technical decisions (from `application-design-plan.md`)

| Decision | Choice |
|---|---|
| Project layout | Single npm package, TypeScript, `server/` + `web/` folders, one `package.json` (Q8=A) |
| Backend | Node + **Express** REST API; also serves the built React app (Q4=A, Q2=A) |
| Frontend | **React + Vite** SPA; lightweight CSS + small shared component set (Q6=A) |
| Storage | **lowdb** — single JSON file at `./data/planner.json` (Q1=B) |
| `.ics` parsing | **node-ical** (Q5=A) |
| Excel export | **exceljs** (Q5=A) |
| Tests | **Vitest** |
| History integrity | Closed iterations are **frozen** via a stored snapshot (Q3=A) |
| Auth | None — `localhost` only, single user (Q16=A) |

---

## Architecture overview

```
Browser (React SPA)  --HTTP/JSON-->  Express API layer
                                          |
                          +---------------+----------------+
                          |   Application services         |
                          |   RosterService, CalendarSvc,  |
                          |   IterationService, TaskService,|
                          |   AllocationService, ReportSvc, |
                          |   ExcelExportService            |
                          +---------------+----------------+
                          |   Pure calculation             |
                          |   WorkingDaysCalculator,        |
                          |   CapacityEngine                |
                          +---------------+----------------+
                          |   Repository (lowdb JSON file)  |
                          +--------------------------------+
```

**Layering rule**: API → services → (calculation + repository). Calculation components are
**pure** (no I/O, no repository access); services pass data into them. Nothing below the API
layer imports Express types.

---

## Backend components

### C1 — Repository
- **Purpose**: The only component that touches the lowdb JSON file. Provides typed collections and atomic save.
- **Responsibilities**:
  - Load/initialise `./data/planner.json` with the schema (see data model).
  - Typed accessors for each collection: `teamMembers`, `holidayCalendars`, `iterations`, `iterationMembers`, `tasks`, `reserveLines`, `capacitySnapshots`, `settings`.
  - Atomic write (write-to-temp then rename) so a crash cannot corrupt the file.
  - Enforce referential rules on delete (e.g. block deleting a member referenced by an open iteration; allow for closed via snapshot).
- **Interface**: `getDb()`, `read()`, `write()`, plus per-collection `find/insert/update/remove` helpers.
- **Depends on**: lowdb only.

### C2 — RosterService
- **Purpose**: Manage the team roster and per-person configuration.
- **Responsibilities**:
  - CRUD `TeamMember` (name, role Dev|QA, locationGroup SL|MY, capacityPercent, additionalDevBuffer, active).
  - Enforce **exactly one** `isScrumMaster` across active members (assigning moves it).
  - Provide the seed roster on first run.
  - Validation: role and locationGroup required; capacityPercent 1–100.
- **Interface**: `listMembers`, `getMember`, `createMember`, `updateMember`, `deactivateMember`, `setScrumMaster`.
- **Depends on**: Repository.

### C3 — CalendarService
- **Purpose**: Store, replace, and parse the two holiday `.ics` calendars; answer holiday queries.
- **Responsibilities**:
  - Accept an uploaded `.ics` for a `locationGroup` (SL|MY); validate it parses; store raw text + parsed holiday dates + metadata (fileName, uploadedAt, eventCount, dateRange).
  - Replace the stored calendar for a location on re-upload.
  - Expose `holidayDatesInRange(locationGroup, startDate, endDate)` → distinct weekday dates.
- **Interface**: `uploadCalendar`, `getCalendarSummary`, `holidayDatesInRange`.
- **Depends on**: Repository, node-ical.

### C4 — WorkingDaysCalculator *(pure)*
- **Purpose**: Turn a date window + holidays + leave into working-day and gross-hour figures.
- **Responsibilities**:
  - `calendarWorkingDays(window)` — count Mon–Fri dates inclusive.
  - `netWorkingDays(window, holidayDates)` — subtract holiday weekdays in window (deduped).
  - `personGrossHours(netWorkingDays, personalLeaveDays, hoursPerDay=7)` — `(net − leave) × 7`, floored at 0.
- **Interface**: three pure functions; no dependencies.
- **Depends on**: nothing.

### C5 — CapacityEngine *(pure)*
- **Purpose**: Compute per-person available hours and the Dev/QA pools per requirements §7.4.
- **Responsibilities**:
  - `personBreakdown(input)` → ordered lines: netWorkingDays, leave, grossHours, ceremonyDeduction, bufferDeduction, remaining, capacityAdjusted, additionalDevBuffer, finalAvailable.
  - `pools(breakdowns)` → `{ devPool, qaPool }` sums by role.
  - Applies fixed constants (ceremonies, buffer %, 7h/day) and per-person inputs (capacity %, additionalDevBuffer flag, isScrumMaster, mauiReviewHours, attendsCeremonies).
- **Interface**: `personBreakdown`, `pools`, plus `CONSTANTS` export.
- **Depends on**: WorkingDaysCalculator (for gross hours) — or receives grossHours pre-computed; final boundary decided in Functional Design.

### C6 — IterationService
- **Purpose**: Manage iterations and orchestrate capacity computation.
- **Responsibilities**:
  - CRUD `Iteration` (number, startDate, endDate, toleranceHours, status planning|closed).
  - Manage `IterationMember` rows (personalLeaveDays, mauiReviewHours, attendsCeremonies) — auto-created for active members when an iteration is created.
  - `computeCapacity(iterationId)` — gather roster + calendars + iteration-member overrides, call CapacityEngine, return per-person breakdowns + pools.
  - `closeIteration(iterationId)` — write a `CapacitySnapshot` + allocation snapshot, set status closed (freeze).
  - `cloneIteration(sourceId)` — new planning iteration, same members/override structure, zeroed leave, no tasks.
  - `reopenIteration(id)` — closed → planning (drops the snapshot as authoritative, recompute live).
- **Interface**: `listIterations`, `getIteration`, `createIteration`, `updateIteration`, `setMemberOverrides`, `computeCapacity`, `closeIteration`, `reopenIteration`, `cloneIteration`.
- **Depends on**: Repository, RosterService, CalendarService, WorkingDaysCalculator, CapacityEngine.

### C7 — TaskService
- **Purpose**: Manage tasks, reserve lines, and assignments within an iteration.
- **Responsibilities**:
  - CRUD `Task` (title, externalId, devEstimateH, qaEstimateH, category, assignedDevId?, assignedQaId?, notes).
  - CRUD `ReserveLine` (label, side Dev|QA, hours); pre-populate a default set on iteration create.
  - Validation: estimates ≥ 0; assignedDev must be a Dev; assignedQa must be a QA; both assignments optional.
  - Block edits when the parent iteration is `closed`.
- **Interface**: `listTasks`, `createTask`, `updateTask`, `deleteTask`, `assignTask`, `listReserveLines`, `upsertReserveLine`, `deleteReserveLine`.
- **Depends on**: Repository, RosterService (role checks), IterationService (status check).

### C8 — AllocationService
- **Purpose**: Combine capacity + assignments into the allocation view.
- **Responsibilities**:
  - `allocation(iterationId)` → per-person `{ available, allocated, remaining, status }` where allocated = Σ assigned estimates; status from tolerance band.
  - `unassigned(iterationId)` → `{ devHours, qaHours }` not assigned to anyone.
  - `poolAllocation(iterationId)` → Dev/QA pool available (minus reserve lines) / allocated / remaining.
  - For a closed iteration, read from the stored snapshot instead of recomputing.
- **Interface**: `allocation`, `unassigned`, `poolAllocation`.
- **Depends on**: IterationService (capacity), TaskService (assignments), Repository (snapshots, settings).

### C9 — ReportService
- **Purpose**: Cross-iteration reporting (planned figures only).
- **Responsibilities**:
  - `allocationReport()` → per iteration: devPool/qaPool capacity, devPool/qaPool allocated, count Over, count Under.
- **Interface**: `allocationReport`.
- **Depends on**: Repository, IterationService, AllocationService.

### C10 — ExcelExportService
- **Purpose**: Render an iteration to `.xlsx`.
- **Responsibilities**:
  - Build a workbook: **Capacity** sheet (per-person breakdown), **Allocation** sheet (per-person available/allocated/remaining/status + pool totals), **Tasks** sheet (task list with assignments).
  - Layout recognisable to users of the current Iteration Planning / Time Allocation sheets.
  - Return a buffer/stream for the API to send as a download.
- **Interface**: `exportIteration(iterationId) → Buffer`.
- **Depends on**: IterationService, AllocationService, TaskService, exceljs.

### C11 — HTTP API layer
- **Purpose**: Thin REST controllers; also serves the built React app and handles file uploads.
- **Responsibilities**:
  - Route → service call → JSON response; error-to-HTTP mapping (400 validation, 404 not found, 409 conflict e.g. closed iteration).
  - `multipart/form-data` handling for `.ics` upload; `.xlsx` download headers for export.
  - Serve `web/dist` static files and SPA fallback.
- **Interface**: Express `Router`s per resource (`/api/members`, `/api/calendars`, `/api/iterations`, `/api/iterations/:id/tasks`, `/api/iterations/:id/allocation`, `/api/report`, `/api/iterations/:id/export`).
- **Depends on**: all services; Express, multer (upload).

---

## Frontend components (React)

| Component | Purpose |
|---|---|
| **AppShell / Nav** | Top-level layout, navigation between screens, active-iteration indicator |
| **RosterScreen** | Table + add/edit form for team members; Scrum Master selector; tolerance & constants panel (US-1, US-2, US-3) |
| **CalendarsScreen** | Upload/replace SL & MY `.ics`; show parse summary (US-4) |
| **IterationsScreen** | List of iterations; create; clone/reopen (US-6, US-8, US-19) |
| **IterationWorkspace** | The main screen for an iteration, with sub-panels: |
| &nbsp;&nbsp;• LeaveOverridesPanel | Per-person leave + overrides (US-7) |
| &nbsp;&nbsp;• CapacityBreakdownPanel | Per-person breakdown lines + Dev/QA pools (US-9, US-10, US-18) |
| &nbsp;&nbsp;• TasksPanel | Task CRUD + assignment controls + reserve lines (US-12, US-13, US-14) |
| &nbsp;&nbsp;• AllocationReviewPanel | Per-person available/allocated/remaining + Over/Under/OK badges + unassigned totals (US-15, US-16, US-17) |
| **ReportScreen** | Cross-iteration table (US-20) |
| **Shared UI kit** | `DataTable`, `StatusBadge`, `NumberField`, `FormRow`, `FileDrop`, `Toast` — lightweight, plain CSS |
| **apiClient** | Typed fetch wrapper for `/api/*`; shared TS types with the backend (`shared/` types) |

---

## Shared types (`shared/`)
TypeScript interfaces for every entity and every API request/response, imported by both
`server/` and `web/` (enabled by the single-package layout).
