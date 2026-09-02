# Component Methods — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → Application Design
**Note**: Method **signatures and purpose only**. Detailed business rules / algorithms are
defined in Functional Design (CONSTRUCTION phase). Types below reference the shared model
(see `application-design.md` §Data Model). Dates are ISO `YYYY-MM-DD` strings.

---

## C1 — Repository

| Method | Purpose | In → Out |
|---|---|---|
| `init()` | Load or create `./data/planner.json`, apply schema defaults, seed roster if empty | `() → Promise<void>` |
| `read()` | Return the in-memory db snapshot | `() → Db` |
| `write()` | Atomically persist the current db (temp file + rename) | `() → Promise<void>` |
| `collection<T>(name)` | Typed handle with `all() / byId(id) / insert(rec) / update(id, patch) / remove(id)` | `(name) → Collection<T>` |
| `isReferenced(entity, id)` | True if a member/iteration is referenced by a non-closed record | `(entity, id) → boolean` |

## C2 — RosterService

| Method | Purpose | In → Out |
|---|---|---|
| `listMembers(opts?)` | All members, optionally active-only | `({activeOnly?}) → TeamMember[]` |
| `getMember(id)` | Single member | `(id) → TeamMember` |
| `createMember(input)` | Validate + insert | `(NewMember) → TeamMember` |
| `updateMember(id, patch)` | Validate + update attributes | `(id, Partial<Member>) → TeamMember` |
| `deactivateMember(id)` | Mark inactive (kept for history) | `(id) → TeamMember` |
| `setScrumMaster(id)` | Set this member as the single SM, clearing any previous | `(id) → TeamMember[]` |
| `seedIfEmpty()` | Insert the 11 seed members on first run | `() → void` |

## C3 — CalendarService

| Method | Purpose | In → Out |
|---|---|---|
| `uploadCalendar(locationGroup, fileName, icsText)` | Parse, validate, store/replace calendar for a location | `(LocationGroup, string, string) → CalendarSummary` |
| `getCalendarSummary(locationGroup?)` | Metadata for one or both stored calendars | `(LocationGroup?) → CalendarSummary[]` |
| `holidayDatesInRange(locationGroup, start, end)` | Distinct **weekday** holiday dates within `[start,end]` | `(LocationGroup, Date, Date) → string[]` |
| `parseIcs(icsText)` | Internal: `.ics` → `{date, summary}[]` (all-day VEVENTs, multi-day expanded) | `(string) → HolidayEvent[]` |

## C4 — WorkingDaysCalculator *(pure functions)*

| Function | Purpose | In → Out |
|---|---|---|
| `calendarWorkingDays(start, end)` | Count Mon–Fri dates inclusive | `(Date, Date) → number` |
| `netWorkingDays(start, end, holidayDates)` | `calendarWorkingDays − (holiday weekdays in window, deduped)` | `(Date, Date, string[]) → number` |
| `personGrossHours(netWorkingDays, personalLeaveDays, hoursPerDay?)` | `max(0, (net − leave)) × hoursPerDay` (default 7) | `(number, number, number?) → number` |

## C5 — CapacityEngine *(pure functions)*

| Function | Purpose | In → Out |
|---|---|---|
| `personBreakdown(input)` | Full ordered breakdown for one person (see §7.4 of requirements) | `(PersonCapacityInput) → PersonBreakdown` |
| `pools(breakdowns)` | Sum `finalAvailable` by role | `(PersonBreakdown[]) → { devPool, qaPool }` |
| `CONSTANTS` | Frozen object of fixed ceremony hours, buffer %, hoursPerDay, additionalDevBufferPct | value |

```ts
type PersonCapacityInput = {
  memberId: string; role: 'Dev' | 'QA';
  netWorkingDays: number; personalLeaveDays: number;
  capacityPercent: number; additionalDevBuffer: boolean;
  isScrumMaster: boolean; attendsCeremonies: boolean; mauiReviewHours: number;
};
type PersonBreakdown = PersonCapacityInput & {
  grossHours: number; ceremonyDeduction: number; bufferDeduction: number;
  remaining: number; capacityAdjusted: number; additionalDevBufferHours: number;
  finalAvailable: number;
};
```

## C6 — IterationService

| Method | Purpose | In → Out |
|---|---|---|
| `listIterations()` | All iterations, newest first | `() → IterationSummary[]` |
| `getIteration(id)` | Iteration + its member overrides | `(id) → IterationDetail` |
| `createIteration(input)` | Create (number, dates, tolerance); auto-add active members as `IterationMember` | `(NewIteration) → IterationDetail` |
| `updateIteration(id, patch)` | Edit number/dates/tolerance (planning only) | `(id, patch) → IterationDetail` |
| `setMemberOverrides(id, memberId, overrides)` | Set leave / mauiReviewHours / attendsCeremonies | `(id, memberId, Overrides) → IterationMember` |
| `computeCapacity(id)` | Live per-person breakdowns + pools (or snapshot if closed) | `(id) → { breakdowns: PersonBreakdown[], devPool, qaPool }` |
| `closeIteration(id)` | Snapshot capacity + allocation, set status `closed` | `(id) → IterationDetail` |
| `reopenIteration(id)` | `closed → planning` | `(id) → IterationDetail` |
| `cloneIteration(sourceId, newNumber, newDates)` | New planning iteration from a template | `(id, number, {start,end}) → IterationDetail` |

## C7 — TaskService

| Method | Purpose | In → Out |
|---|---|---|
| `listTasks(iterationId)` | Tasks for an iteration | `(id) → Task[]` |
| `createTask(iterationId, input)` | Validate estimates ≥ 0, insert | `(id, NewTask) → Task` |
| `updateTask(taskId, patch)` | Edit fields/estimates (planning only) | `(taskId, patch) → Task` |
| `deleteTask(taskId)` | Remove task | `(taskId) → void` |
| `assignTask(taskId, {devId?, qaId?})` | Set/clear Dev and/or QA assignee with role validation | `(taskId, assignment) → Task` |
| `listReserveLines(iterationId)` | Reserve/buffer lines | `(id) → ReserveLine[]` |
| `upsertReserveLine(iterationId, line)` | Add/edit a reserve line | `(id, ReserveLine) → ReserveLine` |
| `deleteReserveLine(lineId)` | Remove | `(lineId) → void` |
| `seedDefaultReserveLines(iterationId)` | Pre-populate the default set on create | `(id) → ReserveLine[]` |

## C8 — AllocationService

| Method | Purpose | In → Out |
|---|---|---|
| `allocation(iterationId)` | Per-person available/allocated/remaining/status | `(id) → PersonAllocation[]` |
| `unassigned(iterationId)` | Unassigned Dev hours + QA hours | `(id) → { devHours, qaHours }` |
| `poolAllocation(iterationId)` | Dev/QA pool available (net of reserve lines) / allocated / remaining | `(id) → { dev: PoolRow, qa: PoolRow }` |

```ts
type PersonAllocation = {
  memberId: string; name: string; role: 'Dev'|'QA'; locationGroup: 'SL'|'MY';
  available: number; allocated: number; remaining: number;
  status: 'Over' | 'Under' | 'OK';
};
```

## C9 — ReportService

| Method | Purpose | In → Out |
|---|---|---|
| `allocationReport()` | Per-iteration pool capacity, pool allocated, Over count, Under count | `() → ReportRow[]` |

## C10 — ExcelExportService

| Method | Purpose | In → Out |
|---|---|---|
| `exportIteration(iterationId)` | Build the `.xlsx` workbook (Capacity / Allocation / Tasks sheets) | `(id) → Promise<Buffer>` |

## C11 — HTTP API layer (routes → service methods)

| Route | Method → Service call |
|---|---|
| `GET/POST/PUT /api/members`, `POST /api/members/:id/deactivate`, `POST /api/members/:id/scrum-master` | RosterService |
| `GET /api/settings`, `PUT /api/settings` | Repository (tolerance, constants read-only) |
| `POST /api/calendars/:location` (multipart), `GET /api/calendars` | CalendarService |
| `GET/POST/PUT /api/iterations`, `POST /api/iterations/:id/close|reopen|clone` | IterationService |
| `PUT /api/iterations/:id/members/:memberId` | IterationService.setMemberOverrides |
| `GET /api/iterations/:id/capacity` | IterationService.computeCapacity |
| `GET/POST/PUT/DELETE /api/iterations/:id/tasks`, `PUT /api/tasks/:taskId/assign` | TaskService |
| `GET/POST/PUT/DELETE /api/iterations/:id/reserve-lines` | TaskService |
| `GET /api/iterations/:id/allocation` | AllocationService (allocation + unassigned + poolAllocation) |
| `GET /api/report` | ReportService |
| `GET /api/iterations/:id/export` | ExcelExportService (returns `.xlsx`) |
| `GET /*` (non-`/api`) | serve `web/dist` + SPA fallback |
