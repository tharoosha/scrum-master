# Services & Orchestration — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → Application Design

The "service layer" is components **C2–C10**. They orchestrate the pure calculation
components (C4, C5) and the Repository (C1). The API layer (C11) is a thin adapter and holds
**no** business logic. This document describes how the services collaborate for the key user
journeys.

---

## Service responsibilities at a glance

| Service | Owns | Calls |
|---|---|---|
| RosterService | team members, SM designation, seed data | Repository |
| CalendarService | `.ics` storage + parsing, holiday queries | Repository, node-ical |
| IterationService | iterations, per-member overrides, capacity orchestration, close/clone/reopen | Repository, RosterService, CalendarService, WorkingDaysCalculator, CapacityEngine |
| TaskService | tasks, reserve lines, assignments | Repository, RosterService, IterationService |
| AllocationService | allocation view, flags, unassigned, pool allocation | IterationService, TaskService, Repository |
| ReportService | cross-iteration report | Repository, IterationService, AllocationService |
| ExcelExportService | `.xlsx` rendering | IterationService, AllocationService, TaskService, exceljs |

**Rule**: services never import each other in a cycle. Dependency direction is
`Report → Allocation → {Iteration, Task} → {Roster, Calendar} → Repository`. Calculation
components (C4/C5) are leaves.

---

## Journey 1 — First run / set up the team

1. `Repository.init()` creates `planner.json`; `RosterService.seedIfEmpty()` inserts the 11 members.
2. SM opens **RosterScreen**, edits members, calls `RosterService.setScrumMaster(id)` — service clears any previous SM and sets the new one atomically.
3. SM opens **CalendarsScreen**, uploads `sl.ics` and `my.ics`; `CalendarService.uploadCalendar()` parses via node-ical, stores raw + parsed dates + summary, returns the summary for display.

## Journey 2 — Plan a new iteration (core loop)

```
SM: create iteration (number, start, end, tolerance)
      → IterationService.createIteration()
          → insert Iteration(status=planning)
          → for each active member: insert IterationMember(leave=0, mauiReviewHours=0, attendsCeremonies=true)
          → TaskService.seedDefaultReserveLines(iterationId)

SM: enter each person's leave / overrides
      → IterationService.setMemberOverrides()

SM: view capacity breakdown
      → IterationService.computeCapacity(iterationId)
          → RosterService.listMembers({activeOnly})
          → CalendarService.holidayDatesInRange(SL, start, end) and (MY, start, end)
          → for each member:
                netWorkingDays = WorkingDaysCalculator.netWorkingDays(start, end, holidays[member.location])
                input = build PersonCapacityInput (netWorkingDays, leave, capacity%, addlBuffer, isSM, attendsCeremonies, mauiReviewHours)
                breakdown = CapacityEngine.personBreakdown(input)
          → pools = CapacityEngine.pools(breakdowns)
          → return { breakdowns, devPool, qaPool }

SM: add tasks and assign them
      → TaskService.createTask() / TaskService.assignTask()  (role validation against RosterService)

SM: view allocation review
      → AllocationService.allocation(iterationId)
          → capacity = IterationService.computeCapacity(iterationId)
          → tasks = TaskService.listTasks(iterationId)
          → per member: allocated = Σ estimates assigned to them
                        remaining = finalAvailable − allocated
                        status = band(remaining, iteration.toleranceHours)
      → AllocationService.unassigned(iterationId)     // Σ estimates with no assignee
      → AllocationService.poolAllocation(iterationId) // pools minus reserve lines vs allocated
```

**Reactivity (US-15)**: the frontend re-calls `GET /api/iterations/:id/allocation` after any
task create/update/delete/assign. The backend recomputes from current data every time
(cheap for ~15 people / ~60 tasks), so both the changed person and any re-assignee reflect
immediately. No server-side push needed.

## Journey 3 — Close & freeze an iteration

1. SM clicks "Close iteration" → `IterationService.closeIteration(id)`:
   - compute `computeCapacity(id)` and `AllocationService.allocation(id)` / `poolAllocation(id)`
   - write a `CapacitySnapshot` record (breakdowns + pools + allocation rows) keyed by iteration
   - set `Iteration.status = closed`
2. Afterwards, `computeCapacity` and `AllocationService.*` detect `status = closed` and return
   the **snapshot** instead of recomputing — roster/calendar changes no longer affect it (Q3=A).
3. `reopenIteration(id)` flips back to `planning`; subsequent reads recompute live. The snapshot
   is retained but no longer authoritative.

## Journey 4 — Clone a past iteration

`IterationService.cloneIteration(sourceId, newNumber, newDates)`:
- new `Iteration(status=planning)`
- copy `IterationMember` rows for members still active, resetting leave to 0 (keep mauiReviewHours/attendsCeremonies if desired — decided in Functional Design)
- copy the reserve-line structure; **no** tasks copied

## Journey 5 — Report

`ReportService.allocationReport()` iterates iterations, for each calls
`IterationService.computeCapacity` + `AllocationService.allocation` (snapshot for closed),
and produces `{ number, devPoolCapacity, qaPoolCapacity, devPoolAllocated, qaPoolAllocated,
overCount, underCount }` rows. Planned figures only (actuals deferred).

## Journey 6 — Excel export

`ExcelExportService.exportIteration(id)` pulls capacity + allocation + tasks, builds a 3-sheet
`exceljs` workbook, returns a Buffer; C11 streams it with
`Content-Disposition: attachment; filename="iteration-<n>.xlsx"`.

---

## Cross-cutting concerns

| Concern | Handling |
|---|---|
| **Validation** | Each service validates its own inputs and throws typed errors (`ValidationError`, `NotFoundError`, `ConflictError`). C11 maps them to 400 / 404 / 409. |
| **Immutability of closed iterations** | Enforced in IterationService and TaskService: any mutating call checks `iteration.status === 'planning'` first, else `ConflictError`. |
| **Transactions** | lowdb is a single in-memory doc; a service method mutates the doc then calls `Repository.write()` once at the end. Atomic file write prevents partial saves. |
| **Concurrency** | Single local user; a simple in-process write mutex in Repository serialises `write()` calls. |
| **Time / dates** | All dates handled as date-only (no timezone). Server local time only used for `uploadedAt` timestamps. |
| **Testability** | C4/C5 are pure and unit-tested directly. Services tested with an in-memory Repository. US-11 validation is a dedicated test feeding Iteration 204/205 data. |
