# Application Design (Consolidated) — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → Application Design
**Date**: 2026-09-01
**Companion docs**: `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`
**Inputs**: `requirements/requirements.md`, `user-stories/stories.md`, `plans/execution-plan.md`, `plans/application-design-plan.md`

---

## 1. Summary

A single local Node + TypeScript application that replaces the Balancer *Iteration Planning*
and *Time Allocation* spreadsheets. One process serves a React SPA and a small REST API; data
lives in one local JSON file. The heart of the system is a **pure capacity engine** that
computes each person's available sprint hours (location-aware working days − leave − ceremonies
− buffers, × capacity %, × Additional Dev Buffer for Arshad) and an **allocation view** that
compares that to the hours assigned to them, flagging **Over / Under / OK**.

## 2. Technology stack (locked)

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript (strict) | shared types across backend/frontend |
| Runtime | Node.js LTS | Q15 = JS/TS full stack |
| Backend framework | Express | minimal REST + static serving (Q4 = REST) |
| File upload | multer | `.ics` multipart handling |
| `.ics` parsing | node-ical | Q5 = established libraries |
| Excel | exceljs | Q5; xlsx generation for FR-28/29 |
| Persistence | lowdb (JSON file at `./data/planner.json`) | Q1 = JSON store |
| Frontend | React + Vite | Q15; fast local dev/build |
| Styling | plain CSS + small shared component set | Q6 = lightweight UI kit |
| Tests | Vitest | unit (pure engine) + service + integration |
| Packaging | one `npm start` (build web → serve on one port) | Q2 = single command |
| Repo layout | single npm package | Q8 = one package |

## 3. Project structure (proposed — finalised in Code Generation)

```
balancer-sprint-planner/
├── package.json                 # one package, all scripts
├── tsconfig.json
├── data/                        # planner.json  (gitignored; created on first run)
├── shared/                      # TS types shared by server + web
│   └── types.ts
├── server/
│   ├── index.ts                 # bootstrap: Repository.init(), Express, serve web/dist
│   ├── api/                     # C11 routers (members, calendars, iterations, tasks, allocation, report, export)
│   ├── services/               # C2, C3, C6, C7, C8, C9, C10
│   ├── calc/                   # C4 workingDays.ts, C5 capacityEngine.ts  (pure)
│   ├── repository/             # C1 lowdb wrapper + schema + seed
│   └── errors.ts               # ValidationError / NotFoundError / ConflictError
├── web/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── api/client.ts       # typed fetch wrapper
│       ├── ui/                 # DataTable, StatusBadge, NumberField, FormRow, FileDrop, Toast
│       └── screens/            # Roster, Calendars, Iterations, IterationWorkspace, Report
└── test/                        # vitest specs incl. iteration-204-205 validation fixture
```

> Application code lives at the workspace root per the AI-DLC directory rule; `aidlc-docs/`
> holds documentation only.

## 4. Components

See `components.md` for full detail. Eleven backend components in four layers:

- **API (C11)** — Express routers, error→HTTP mapping, `.ics` upload, `.xlsx` download, static SPA serving.
- **Services (C2, C3, C6, C7, C8, C9, C10)** — RosterService, CalendarService, IterationService, TaskService, AllocationService, ReportService, ExcelExportService.
- **Pure calculation (C4, C5)** — WorkingDaysCalculator, CapacityEngine. No I/O; unit-tested directly.
- **Persistence (C1)** — Repository over a single lowdb JSON document with atomic writes.

Frontend: `AppShell` + five screens, a shared `apiClient`, and a small plain-CSS UI kit.

## 5. Data model

All collections in one JSON document (`planner.json`). IDs are short strings (nanoid).

```ts
// shared/types.ts (indicative)

type LocationGroup = 'SL' | 'MY';
type Role = 'Dev' | 'QA';
type IterationStatus = 'planning' | 'closed';

interface Settings {
  toleranceHours: number;            // default 4
  // fixed constants are code-level (CapacityEngine.CONSTANTS), surfaced read-only in the UI
}

interface TeamMember {
  id: string; name: string; role: Role; locationGroup: LocationGroup;
  capacityPercent: number;           // 70 for Arshad, 90 others
  additionalDevBuffer: boolean;      // true only for Arshad
  isScrumMaster: boolean;            // exactly one active member true
  active: boolean;
}

interface HolidayEvent { date: string; summary: string; }   // date-only
interface HolidayCalendar {
  locationGroup: LocationGroup;
  sourceFileName: string; uploadedAt: string;
  events: HolidayEvent[];            // parsed, all-day, multi-day expanded
  rawIcs: string;
}

interface Iteration {
  id: string; number: number;
  startDate: string; endDate: string;
  toleranceHours: number;            // copied from Settings at create, editable while planning
  status: IterationStatus;
  closedAt?: string;
}

interface IterationMember {
  iterationId: string; memberId: string;
  personalLeaveDays: number;         // default 0
  mauiReviewHours: number;           // default 0
  attendsCeremonies: boolean;        // default true
}

interface Task {
  id: string; iterationId: string;
  title: string; externalId: string;          // free text e.g. "AB-12510"
  devEstimateH: number; qaEstimateH: number;   // >= 0
  category?: 'Capex' | 'Opex';
  assignedDevId?: string; assignedQaId?: string;
  notes?: string;
}

interface ReserveLine {
  id: string; iterationId: string;
  label: string; side: Role; hours: number;    // subtracted from that pool
}

interface CapacitySnapshot {                    // written on closeIteration (freeze)
  iterationId: string; createdAt: string;
  breakdowns: PersonBreakdown[];                // per person, all lines
  devPool: number; qaPool: number;
  allocation: PersonAllocation[];               // per person available/allocated/remaining/status
  poolAllocation: { dev: PoolRow; qa: PoolRow };
}
```

`PersonBreakdown`, `PersonAllocation`, `PoolRow` — see `component-methods.md`.

## 6. Key design decisions & rationale

| Decision | Rationale |
|---|---|
| **Pure calculation layer (C4/C5) separated from services** | The §7 formulas are the main correctness risk (requirements risk assessment). Keeping them pure makes the US-11 validation and edge-case testing straightforward. |
| **JSON file store (lowdb)** | Q1=B. Data volume is tiny (~15 members, ~20 iterations, ~60 tasks each). Human-readable, trivially backed up/copied, no native build step. Atomic temp-file write covers integrity. |
| **Freeze on close via CapacitySnapshot** | Q3=A. Guarantees historical reports and past iterations never shift when the roster or calendars change later. |
| **Recompute allocation on every read** | Cheap at this scale; removes cache-invalidation bugs; satisfies US-15 "updates immediately" with a simple re-fetch. |
| **One Express process serves the SPA** | Q2=A. Single `npm start`, one `localhost` URL — matches the non-technical Scrum Master persona. |
| **REST, not tRPC** | Q4=A. Transparent, inspectable, no extra framework; shared TS types still give type-safety on the client. |
| **Single npm package** | Q8=A. Least setup for one small app; `shared/` types importable by both sides. |
| **`isScrumMaster` on TeamMember, enforced singleton in RosterService** | Matches "only 1 person in the project can have SM role" (clarification round 2). |
| **`additionalDevBuffer` / `capacityPercent` per-member fields** | Faithful to the current sheet (Arshad 70% + 50% buffer, others 90%), while leaving the door open to change who they apply to without code changes. |

## 7. Story-group coverage check (C7)

| Story group | Components involved | Gap? |
|---|---|---|
| Roster & Configuration (US-1..3) | RosterService, Repository, RosterScreen, Settings route | none |
| Holiday Calendars (US-4..5) | CalendarService, node-ical, CalendarsScreen | none |
| Iteration Setup (US-6..8) | IterationService, Repository, IterationsScreen, LeaveOverridesPanel | none |
| Capacity Calculation (US-9..11) | WorkingDaysCalculator, CapacityEngine, IterationService, CapacityBreakdownPanel, Vitest fixture | none |
| Tasks & Assignment (US-12..15) | TaskService, RosterService, TasksPanel; allocation re-fetch for US-15 | none |
| Allocation Review (US-16..18) | AllocationService, AllocationReviewPanel | none |
| History & Reporting (US-19..20) | IterationService, ReportService, CapacitySnapshot, ReportScreen | US-20 `Later` — component present, screen deferrable |
| Excel Export (US-21) | ExcelExportService, exceljs, export route | none |

**No blocking gaps.** Deferred items (planned-vs-actual FR-27, Team Member view) are not part
of this design and are explicitly out of scope for the first release.

## 8. What Functional Design will detail next

- Exact ceremony formula wiring in `CapacityEngine` (Daily Scrum = `netWorkingDays × 0.25`, fixed 1/2/0.5/1.5, +20 SM, + mauiReviewHours; the Opex/Capex buffer % list — confirm assumption A1).
- Rounding rules and the ±0.5h tolerance for the Iteration 204/205 validation.
- Clone semantics (which overrides carry over).
- Default reserve-line set.
- `.ics` parsing edge cases (recurring events, multi-day spans, timezone-free handling).
- Snapshot contents and the exact read-path switch for closed iterations.
