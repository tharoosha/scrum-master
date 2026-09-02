# Code Generation Plan — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Code Generation (Part 1: Planning)
**Unit**: `sprint-planner` (single unit — the whole application)
**This plan is the single source of truth for Code Generation. Steps run in order; each is checked off as completed.**

**Inputs**: `application-design/*`, `construction/sprint-planner/functional-design/*`, `user-stories/stories.md`

---

## Unit context

| Item | Value |
|---|---|
| Workspace root | `C:\Users\VihidunPathiranage\myfolder\AIDLC-training` |
| Project type | Greenfield, single unit, single npm package, TypeScript |
| Application code location | workspace root: `server/`, `web/`, `shared/`, `test/`, plus root config files |
| Documentation location | `aidlc-docs/construction/sprint-planner/code/` (markdown summaries only) |
| Dependencies on other units | none |
| External libraries | express, multer, node-ical, exceljs, lowdb, nanoid, vite, react, react-dom, typescript, vitest, @testing-library/react, supertest |
| Data entities owned | Settings, TeamMember, HolidayCalendar, Iteration, IterationParticipant, ExtraAssignment, Task (all in one lowdb JSON doc) |
| Runtime | `npm start` → build `web/` then run `server/` on one localhost port |

### Story coverage (US-1…US-21)

| Story | Implemented in step(s) |
|---|---|
| US-1 Manage team members | 3, 7, 13, 16 |
| US-2 Designate Scrum Master | 7, 13, 16 |
| US-3 Constants + tolerance | 2, 7, 13, 16 |
| US-4 Upload/replace calendars | 6, 13, 16 |
| US-5 Per-location holiday resolution | 4, 6, 8 |
| US-6 Create/edit iteration | 8, 13, 17 |
| US-7 Leave + overrides + extra assignments | 8, 13, 17 |
| US-8 Clone/reopen (`Later`) | not implemented — deferred by design (no close/clone) |
| US-9 Per-person capacity breakdown | 5, 8, 13, 17 |
| US-10 Dev/QA pools | 5, 10, 13, 17 |
| US-11 Validation vs Iteration 204/205 | 5 (tests) |
| US-12 Task CRUD | 9, 13, 17 |
| US-13 Assign Dev/QA sides | 9, 13, 17 |
| US-14 Manual Dev/QA buffer (reserve) | 8, 10, 17 |
| US-15 Immediate allocation update | 10, 17 (UI re-fetch) |
| US-16 Per-person allocation table + flags | 10, 13, 17 |
| US-17 Unassigned hours surfaced | 10, 13, 17 |
| US-18 Aggregate pool view | 10, 13, 17 |
| US-19 Retain & browse iterations | 3, 8, 13, 17 |
| US-20 Cross-iteration report (`Later`) | 11, 13, 18 |
| US-21 Excel export | 12, 13, 17 |

---

## Generation steps

### Step 1 — Project structure & tooling `[x]`
> Done: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`. (lowdb replaced by a small hand-written atomic-JSON `Repository` — one less dependency.)
- Create: `package.json` (scripts: `dev`, `build`, `start`, `test`, `typecheck`), `tsconfig.json` (+ `tsconfig.node.json`), `vite.config.ts`, `.gitignore` (`node_modules`, `data/`, `web/dist`), `.editorconfig`, `README.md` skeleton.
- Create empty dirs with `.gitkeep`: `server/`, `web/src/`, `shared/`, `test/`, `data/`.
- `npm` dependency list installed via `package.json` (no install run here — noted for Build & Test).

### Step 2 — Shared types & constants `[x]` — US-3
> Done: `shared/types.ts`, `shared/constants.ts`.
- `shared/types.ts` — all entity interfaces + API request/response DTOs (from `domain-entities.md`).
- `shared/constants.ts` — default `Settings` object (ceremony hours, buffer config with capex/opex %, smActivityHours 20, defaultMauiReviewHours 0, commonAutomation {20,10}, additionalDevBufferPercent 50, hoursPerDay 7, defaultCapacityPercent 90, defaultToleranceHours 4).

### Step 3 — Repository layer `[x]` — US-1, US-19
> Done: `server/errors.ts`, `server/repository/schema.ts`, `server/repository/seed.ts` (Vihidun = default SM), `server/repository/index.ts`.
> **Post-delivery revision**: multi-file synchronous atomic store — `data/planner.json` (master) + `data/iterations/iteration-<n>.json` (per iteration) + `data/calendars/<loc>.ics` (raw holiday files). `writeFileSync`+`renameSync`, content-diffed, orphan reconciliation. See `code/repository-summary.md`.
- `server/repository/schema.ts` — lowdb `Data` shape + defaults.
- `server/repository/seed.ts` — 11 seed `TeamMember`s (per `domain-entities.md` §2).
- `server/repository/index.ts` — `init()`, `read()`, `write()` (atomic temp+rename), typed `collection<T>()` helpers, write mutex, `isReferenced()`.
- `server/errors.ts` — `ValidationError`, `NotFoundError`, `ConflictError`.

### Step 4 — WorkingDaysCalculator (pure) `[x]` — US-5
> Done: `server/calc/workingDays.ts` + `workingDays.test.ts`.
- `server/calc/workingDays.ts` — `calendarWorkingDays`, `netWorkingDays`, `personWorkingDays`, `grossHours` (per `business-logic-model.md` §2).

### Step 5 — CapacityEngine (pure) `[x]` — US-9, US-10, US-11
> Done: `server/calc/capacityEngine.ts` + `capacityEngine.test.ts` (reproduces Iteration 205 sheet rows 18/21/25; ceremony auto-exclusion). Full US-11 fixture in Step 21.
- `server/calc/capacityEngine.ts` — `personBreakdown`, `pools`, `CONSTANTS` (per `business-logic-model.md` §3, `business-rules.md` BR-CE/X/CAP/POOL).

### Step 6 — CalendarService `[x]` — US-4, US-5
> Done: `server/services/calendarService.ts` + `calendarService.test.ts`.

### Step 7 — RosterService & SettingsService `[x]` — US-1, US-2, US-3
> Done: `server/services/rosterService.ts` (+ test), `server/services/settingsService.ts`.

### Step 8 — IterationService `[x]` — US-6, US-7, US-9, US-10, US-14, US-19
> Done: `server/services/iterationService.ts` (create/copy participants + holiday dates + auto SM-Activity, participant overrides, extra assignments, computeCapacity, delete cascade) + `iterationAllocation.test.ts`.

### Step 9 — TaskService `[x]` — US-12, US-13
> Done: `server/services/taskService.ts` (CRUD + role-validated assignment).

### Step 10 — AllocationService `[x]` — US-10, US-14, US-15, US-16, US-17, US-18
> Done: `server/services/allocationService.ts` (allocation + flags, unassigned, poolAllocation, capexOpexSummary).

### Step 11 — ReportService `[x]` — US-20 (`Later`)
> Done: `server/services/reportService.ts`.

### Step 12 — ExcelExportService `[x]` — US-21
> Done: `server/services/excelExportService.ts` (Capacity / Allocation / Tasks sheets via exceljs).

### Step 13 — HTTP API layer `[x]` — all stories
> Done: `server/container.ts`, `server/api/errorMiddleware.ts`, `server/api/index.ts`, routers `members.ts` / `settings.ts` / `calendars.ts` (multer) / `iterations.ts` (also tasks-list/create, extra-assignments, capacity, allocation, export) / `tasks.ts` / `report.ts` + `api.test.ts` (supertest).

### Step 14 — Server bootstrap `[x]`
> Done: `server/index.ts` — builds services, creates app, listens on `PORT` (default 4319), prints URL + data path.

### Step 15 — Frontend scaffold & UI kit `[x]` — US-3
> Done: `web/index.html`, `web/src/main.tsx`, `web/src/styles.css`, `web/src/test-setup.ts`, `web/src/api/client.ts`, `web/src/ui/kit.tsx` (StatusBadge, NumberField, FormRow, FileDrop, ToastProvider, useAsyncAction, n2).
- `web/index.html`, `web/src/main.tsx`, `web/src/styles.css`.
- `web/src/api/client.ts` — typed fetch wrapper using `shared/types`.
- `web/src/ui/` — `DataTable`, `StatusBadge`, `NumberField`, `TextField`, `SelectField`, `FormRow`, `FileDrop`, `Toast`, `ConfirmDialog`, `Tabs` (all with stable `data-testid`s).
- `web/src/state/` — `ActiveIterationContext`, `ToastContext`.

### Step 16 — Frontend: Roster & Calendars & Iterations screens `[x]` — US-1..4, US-6, US-19
> Done: `web/src/screens/RosterScreen.tsx` (+ SettingsPanel), `CalendarsScreen.tsx`, `IterationsScreen.tsx`.

### Step 17 — Frontend: IterationWorkspace (tabs) `[x]` — US-7, US-9..18, US-21
> Done: `web/src/screens/IterationWorkspace.tsx` with PeopleTab / CapacityTab / TasksTab / AllocationTab, header summary strip (pools + Capex/Opex), Export link, `refresh()` after every mutation (US-15).

### Step 18 — Frontend: Report + AppShell wiring `[x]` — US-20
> Done: `web/src/screens/ReportScreen.tsx`, `web/src/App.tsx` (shell + nav + screen switching).

### Step 19 — Frontend tests `[x]`
> Done: `web/src/ui/kit.test.tsx` (n2, StatusBadge), `web/src/screens/RosterScreen.test.tsx` (renders seed, blocks empty-name add, adds valid member).

### Step 20 — Documentation `[x]`
> Done: `aidlc-docs/construction/sprint-planner/code/` — `business-logic-summary.md`, `api-summary.md`, `repository-summary.md`, `frontend-summary.md`. `README.md` rewritten with install / run / first-time-setup / tests.

### Step 21 — Build wiring & final check `[x]`
> Done: `package.json` scripts (`dev`, `build`, `start`, `test`, `typecheck`); `test/us11-iteration-205-validation.test.ts`.
> **Verified locally**: `npx tsc --noEmit` clean; `npx vitest run` = 45/45 passing (a location-scoped-holiday regression test was added during Build & Test); `npx vite build` succeeds; server boots, `/api/health` + seed roster + SPA all served.

---

## Notes / deferred by design
- **US-8** (close / reopen / clone) — not built; the approved functional design replaced it with "create a new iteration from the current roster and adjust".
- **US-20** report screen — `Later` priority; the service + endpoint + a basic screen are included, kept minimal.
- Auth, deployment infra, Jira integration, planned-vs-actual — out of scope per earlier decisions.
- Tests are generated here but **executed** in the Build and Test stage.
