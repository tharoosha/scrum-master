# Requirements — Sprint Time Allocation / Scrum Master Software

**Status**: Draft for review
**Stage**: INCEPTION → Requirements Analysis
**Depth**: Standard (with a detailed capacity-calculation specification, since that is the core of the product)
**Date**: 2026-09-01

---

## 1. Intent Analysis Summary

| Attribute | Assessment |
|---|---|
| **User request** | Build a Scrum Master tool that allocates sprint time **per individual** instead of only at the aggregate Dev/QA pool level, so sprints stop being silently over- or under-allocated. Replace the two-spreadsheet workflow (*Balancer Iteration Planning Sheet* + *Balancer Time Allocation Sheet*). Support uploading Sri Lanka and Malaysia public-holiday `.ics` calendars, with the Malaysia team (Arshad, Meng, Ameerah) counted against Malaysian holidays. |
| **Request type** | New Project (greenfield) |
| **Scope estimate** | System-wide (new standalone application) |
| **Complexity estimate** | Moderate — small single team, but a non-trivial capacity-calculation engine and calendar handling |
| **Request clarity** | Clear on the problem and the calculation rules (derived from the supplied sheets + clarifications); delivery choices confirmed via Q&A |

---

## 2. Problem Statement

Today the team plans a sprint with two linked Excel sheets:

1. **Iteration Planning Sheet** — for each person it computes available hours:
   `(working days in sprint − personal leave) × 7h`, then subtracts scrum ceremonies and
   Opex/Capex buffer percentages, applies a capacity factor (70% for Arshad, 90% for
   everyone else), and — for Arshad only — an *Additional Dev Buffer* of 50%. Each person's
   result is then **summed** into one **Dev pool** total and one **QA pool** total.
2. **Time Allocation Sheet** — subtracts the sum of all task **Dev estimates** and the sum of
   all task **QA estimates** from those two pool totals.

**Because balancing is done only at the pool level, a sprint can look balanced in total while
individuals are over- or under-allocated.** Iteration 205 example: the Dev pool showed **~+39h
spare** while the QA pool showed **~−47h over-allocated**; individual Devs were also uneven.
Holidays are also applied as an aggregate rather than per person / per location.

---

## 3. Goals & Success Criteria

| # | Goal | Success criterion |
|---|---|---|
| G1 | Allocate and track sprint time **per person** | Every person shows available hours, allocated hours, and remaining hours for the iteration |
| G2 | Make over/under-allocation visible before the sprint starts | Each person is flagged **Over / Under / OK** against a configurable tolerance band |
| G3 | Correct, location-aware holiday handling | SL team uses the SL holiday calendar; Malaysia team (Arshad, Meng, Ameerah) uses the Malaysia calendar; leave is per person |
| G4 | Replace the two spreadsheets with one tool | Iteration can be planned end-to-end in the app; results exportable to Excel |
| G5 | Keep sprint history | All past iterations retained; planned-vs-actual reporting available |
| G6 | Preserve the current calculation exactly | For a given iteration, the tool reproduces the current sheet's Dev pool and QA pool totals (within rounding) |

---

## 4. Users

| Persona | Description | Usage |
|---|---|---|
| **Scrum Master** (primary) | Runs the tool locally, plans each iteration, assigns tasks, manages the roster, uploads holiday calendars. Exactly **one** person holds the SM role at a time (configurable). | Full read/write |
| **Team Lead** (secondary) | Reviews allocation, adjusts task assignments. | Read/write |
| **Team member** | May view their own allocation. | Read (not a launch requirement — see §8) |

Data sensitivity is low (internal team only). No authentication required for the initial local-app delivery.

---

## 5. Scope

### In scope
- Team roster with per-person configuration (role, location group, capacity %, flags)
- Two holiday calendars via `.ics` upload (SL, Malaysia), stored and reused
- Iteration definition (number, start date, end date)
- Per-person capacity calculation engine (§7.4) reproducing the current sheet logic
- Manual task entry with Dev and QA estimates, manual assignment to people
- Per-person allocation tracking + Over/Under/OK flagging
- Aggregate Dev pool / QA pool view alongside the per-person view
- Iteration history + planned-vs-actual reporting
- Excel export of the iteration plan and allocation

### Out of scope (initial release)
- Jira / Azure DevOps integration (task IDs are Jira `AB-xxxxx`, but entry is manual for now)
- Automatic task assignment / load-balancing algorithm (tool assists and warns only)
- Multi-team support (one team only; data model should not preclude adding teams later)
- User accounts, roles, SSO, hosting/deployment infrastructure
- Time tracking of actual hours worked (unless entered manually for reporting — see §7.7)
- Import of the legacy Excel sheets (data is re-entered in the tool)

---

## 6. Functional Requirements

### 6.1 Team roster & configuration
- **FR-1** The SM can add, edit, and deactivate team members. Each member has: name, **role** (`Dev` or `QA`, exactly one), **location group** (`Sri Lanka` or `Malaysia`), **capacity %** (default 90; Arshad = 70), **Additional Dev Buffer** flag (default off; on for Arshad), active/inactive.
- **FR-2** Seed roster (from the current sheet):
  - **Devs (8):** Arshad *(Malaysia, 70%, Additional Dev Buffer ON)*, Prasanna, Meng *(Malaysia)*, Tharindu, Ameerah *(Malaysia)*, Vihidun, Thilina, Chamath — all 90%, buffer OFF.
  - **QAs (3):** Ishara, Sandun, Charitha — all Sri Lanka, 90%, buffer OFF.
- **FR-3** Exactly one team member is designated **Scrum Master**. This designation is configurable and can be reassigned; assigning it to a new person removes it from the previous holder.
- **FR-4** Ceremony hours and buffer percentages are **fixed defaults** matching the current sheet (§7.4). They are not user-editable in the initial release, except the per-person overrides explicitly listed in FR-5.
- **FR-5** Per-person, per-iteration overrides the SM can set: personal leave days, "does not attend ceremonies" (zero out ceremony deductions), MAUI Review hours (default 0). SM Activity (20h) is applied automatically to whoever holds the SM role.

### 6.2 Holiday calendars
- **FR-6** The SM can upload an `.ics` file for **Sri Lanka** holidays and a separate `.ics` for **Malaysia** holidays. Uploaded calendars are stored and reused for all iterations until replaced.
- **FR-7** Re-uploading a calendar replaces the stored one. The tool shows the calendar's name, event count, and covered date range.
- **FR-8** Only all-day / date events within the relevant iteration window are counted as holidays. A holiday falling on a weekend is not double-counted.
- **FR-9** Each person's holidays are taken from **their location group's** calendar.

### 6.3 Iteration setup
- **FR-10** The SM creates an iteration with: iteration number, start date, end date.
- **FR-11** The tool computes, per location group: total calendar working days in the window (Mon–Fri), minus that group's public holidays in the window = **net working days (location)**.
- **FR-12** The SM records each person's **personal leave** (in days) for the iteration.
- **FR-13** Iterations are retained indefinitely; a past iteration can be reopened read-only or cloned as the basis for a new one.

### 6.4 Capacity calculation engine
- **FR-14** For each active person the tool computes available hours per the formulas in **§7.4** and displays every intermediate line (gross hours, ceremony deduction, buffer deduction, remaining, capacity-adjusted, additional dev buffer, final available hours).
- **FR-15** The tool computes the **Dev pool** = Σ final available hours of all Devs, and the **QA pool** = Σ final available hours of all QAs, and shows both.
- **FR-16** Working day = 7 productive hours; work week = Mon–Fri.

### 6.5 Tasks & allocation
- **FR-17** The SM can add/edit/delete tasks for an iteration. Each task has: title, external ID (free text, e.g. `AB-12510`), **Dev estimate (h)**, **QA estimate (h)**, optional category (Capex/Opex), notes.
- **FR-18** Each task's Dev estimate can be assigned to one Dev; its QA estimate can be assigned to one QA. Either side may be left unassigned.
- **FR-19** For each person: **allocated hours** = Σ estimates assigned to them; **remaining** = final available hours − allocated hours.
- **FR-20** Each person is flagged **Over** (remaining < −tolerance), **Under** (remaining > +tolerance), or **OK** (within tolerance). Tolerance is a single configurable value (default e.g. 4h).
- **FR-21** The iteration view lists unassigned task hours (Dev and QA separately) so nothing is missed.
- **FR-22** Standard buffer/reserve lines from the current sheet (Dev Buffer, QA Buffer, Discussions, Move-to-backlog, Risk list) are represented as pseudo-tasks or reserved hours so the pool math matches the current Time Allocation Sheet.

### 6.6 Views
- **FR-23** Per-person allocation table: name, role, location, available h, allocated h, remaining h, status flag.
- **FR-24** Aggregate view: Dev pool available/allocated/remaining; QA pool available/allocated/remaining (mirrors today's summary).
- **FR-25** Task list view with assignment columns.

### 6.7 History & reporting
- **FR-26** A cross-iteration report showing, per iteration: pool capacity, pool allocated, per-person over/under counts.
- **FR-27** If actual hours are entered for a completed iteration, the report shows **planned vs actual** per person and per pool. (Manual entry of actuals is optional.)

### 6.8 Export
- **FR-28** Export the current iteration (capacity breakdown + per-person allocation + task list + pool totals) to an `.xlsx` file.
- **FR-29** Exported layout should be recognisable to people used to the current sheets (capacity breakdown sheet + allocation sheet).

---

## 7. Calculation Specification (derived from the supplied sheets + clarifications)

### 7.1 Constants (fixed, matching the current sheet)
| Item | Value |
|---|---|
| Productive hours per working day | 7 |
| Work week | Monday–Friday |
| Daily Scrum | 0.25 h per working day (≈ `netWorkingDays × 0.25`) |
| Planning | 1 h |
| Grooming | 2 h |
| Retro | 0.5 h |
| Demo | 1.5 h |
| SM Activity | 20 h — **only** the person holding the SM role |
| MAUI Review | 0 h default (per-person override allowed) |
| Dev Buffer | 5% of gross hours |
| Discussion / Opex-Capex buffer split | 2.5% + 3% + 1.5% + 3% + 1.5% of gross hours (as per the sheet's Opex/Capex columns) |
| Capacity factor | 70% for Arshad, 90% for everyone else |
| Additional Dev Buffer | 50% — **only** Arshad |
| Allocation tolerance band | ±4 h (configurable) |

> **Assumption to confirm (A1):** the Opex/Capex buffer percentages above are read from Iteration 204/205 of the *Iteration Planning Sheet*. Please confirm the exact list, or that "reproduce the sheet" is sufficient.

### 7.2 Working days
```
calendarWorkingDays(window)      = count of Mon–Fri dates between start and end (inclusive)
holidays(location, window)       = count of that location's .ics holiday dates that fall on a Mon–Fri in the window
netWorkingDays(location, window) = calendarWorkingDays(window) − holidays(location, window)
```

### 7.3 Per-person gross hours
```
personWorkingDays = netWorkingDays(person.location, window) − person.personalLeaveDays
grossHours        = personWorkingDays × 7
```

### 7.4 Per-person available hours
```
ceremonyDeduction = (netWorkingDays × 0.25)      // Daily Scrum
                  + 1 + 2 + 0.5 + 1.5            // Planning, Grooming, Retro, Demo
                  + (person is SM ? 20 : 0)      // SM Activity
                  + person.mauiReviewHours       // default 0
   // if person marked "does not attend ceremonies", ceremonyDeduction = 0

bufferDeduction   = grossHours × (5% + 2.5% + 3% + 1.5% + 3% + 1.5%)   // per the sheet

remaining         = grossHours − ceremonyDeduction − bufferDeduction

capacityAdjusted  = remaining × person.capacityPercent        // 70% Arshad, 90% others

finalAvailable    = person.additionalDevBuffer
                       ? capacityAdjusted × 50%               // Arshad only
                       : capacityAdjusted
```

### 7.5 Pools
```
devPool = Σ finalAvailable for all active Devs
qaPool  = Σ finalAvailable for all active QAs
```

### 7.6 Allocation & flags
```
person.allocated  = Σ (taskDevEstimate where assignedDev = person)
                  + Σ (taskQaEstimate  where assignedQa  = person)
person.remaining  = person.finalAvailable − person.allocated
person.status     = person.remaining < -tolerance ? "Over"
                  : person.remaining >  tolerance ? "Under"
                  : "OK"
```

### 7.7 Validation target
For each historical iteration entered, `devPool` and `qaPool` must match the corresponding
*Iteration Planning Sheet* totals within ±0.5 h (rounding).

---

## 8. Non-Functional Requirements

| # | Requirement |
|---|---|
| **NFR-1 — Delivery** | Runs locally: a Node/TypeScript backend + React frontend that the Scrum Master starts and opens in a browser (`localhost`). Single-process, no external services. |
| **NFR-2 — Persistence** | Local persistent store (e.g. SQLite or a local JSON/embedded DB). Data survives restarts. All iterations retained. |
| **NFR-3 — Tech stack** | JavaScript/TypeScript full stack — Node backend, React frontend (per Q15). |
| **NFR-4 — Portability** | Must run on Windows (the SM's machine). A single command to start the app. |
| **NFR-5 — Backup/portability of data** | The data store is a single file that can be copied/backed up; export to Excel covers sharing with management. |
| **NFR-6 — Usability** | A non-technical Scrum Master can plan an iteration without reading a manual; all calculation lines are visible and traceable (no hidden math). |
| **NFR-7 — Correctness** | Calculation engine covered by automated unit tests, including the §7.7 validation against at least one real historical iteration. |
| **NFR-8 — Performance** | One team (~11–15 people, ~40–60 tasks per iteration, ~20 iterations of history). All views render effectively instantly; no scalability concerns. |
| **NFR-9 — Security** | Out of scope for the initial local release (Security Baseline extension declined). No secrets, no network exposure beyond `localhost`. |
| **NFR-10 — Resiliency** | Out of scope (Resiliency Baseline extension declined). Basic input validation and a safe-write to the local store are sufficient. |
| **NFR-11 — .ics parsing** | Handle standard iCalendar all-day `VEVENT` entries; tolerate multi-day holidays and recurring events reasonably; show a parse summary so the SM can sanity-check. |
| **NFR-12 — Testing** | Property-Based Testing extension declined; standard unit + integration tests. The calculation engine is the priority for test coverage. |

---

## 9. Data Model (indicative)

- **TeamMember**: id, name, role (Dev/QA), locationGroup (SL/MY), capacityPercent, additionalDevBuffer (bool), isScrumMaster (bool), active (bool)
- **HolidayCalendar**: locationGroup (SL/MY), sourceFileName, uploadedAt, events[] (date, summary)
- **Iteration**: id, number, startDate, endDate, toleranceHours, status (planning/closed)
- **IterationMember**: iterationId, memberId, personalLeaveDays, mauiReviewHours, attendsCeremonies (bool), — plus computed/cached capacity lines
- **Task**: id, iterationId, title, externalId, devEstimateH, qaEstimateH, category (Capex/Opex/none), assignedDevId?, assignedQaId?, notes
- **ReserveLine**: iterationId, label (Dev Buffer / QA Buffer / Discussions / …), side (Dev/QA), hours
- **ActualEntry** (optional, for reporting): iterationId, memberId, actualHours

---

## 10. Assumptions & Open Items (please confirm at review)

- **A1** — Opex/Capex buffer percentage list (§7.1) is taken as-is from the sheet; confirm the exact set or that "reproduce the sheet totals" is the requirement.
- **A2** — "Daily Scrum" deduction is modelled as `netWorkingDays × 0.25` (15 min/day), matching the sheet formula `hours × 0.25 / 7`.
- **A3** — QA people use the same ceremony set and the same 90% capacity factor as Devs (the sheet shows the same ceremony values for QA rows). Confirm.
- **A4** — MAUI Review defaults to 0h and is a per-person per-iteration override. Confirm whether it should instead be a fixed rota.
- **A5** — Reserve lines (Dev Buffer, QA Buffer, Discussions, Move-to-backlog, Risk list) are entered as reserved hours against the pool, not assigned to individuals. Confirm.
- **A6** — "Assist / warn only" means the tool never moves a task automatically; the SM does all assignment. Confirmed (Q1=A).
- **A7** — No authentication in the initial release (Q16=A, local app). Team-member read-only view is a later enhancement, not a launch requirement.

---

## 11. Key Requirements Summary

- A **local Node + React app** replacing the two Balancer spreadsheets, run by the Scrum Master.
- **Per-person capacity engine** reproducing the current sheet math exactly: gross hours from
  location-aware working days minus personal leave, minus a fixed ceremony set (+20h SM Activity
  for the single SM), minus fixed Opex/Capex buffers, × capacity % (70% Arshad / 90% others),
  × 50% Additional Dev Buffer for Arshad only.
- **Two holiday calendars** (SL, Malaysia) uploaded once as `.ics`, stored, reused; Malaysia team
  = Arshad, Meng, Ameerah.
- **Manual task entry and assignment**; per-person allocated vs available with **Over / Under / OK**
  flags against a tolerance band; unassigned hours surfaced.
- **Both views**: per-person and aggregate Dev/QA pool.
- **History retained** with planned-vs-actual reporting; **Excel export** of each iteration.
- Extensions **Security, Resiliency, Property-Based Testing all declined**; standard unit/
  integration testing with the calculation engine as the coverage priority.
