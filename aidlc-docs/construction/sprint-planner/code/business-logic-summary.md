# Code Summary — Business Logic (unit: sprint-planner)

## Pure calculation (`server/calc/`)

| File | Exports | Rules |
|---|---|---|
| `workingDays.ts` | `parseDate`, `formatDate`, `isWeekday`, `eachDate`, `calendarWorkingDays`, `netWorkingDays`, `personWorkingDays`, `grossHours` | BR-W1..W5 |
| `capacityEngine.ts` | `personBreakdown`, `pools`, `totalBufferPercent`, `bufferSplitPercent`, `round2` | BR-CE*, BR-X5, BR-CAP*, BR-POOL* |

Both are side-effect free and unit-tested directly (`*.test.ts` next to each).

## Services (`server/services/`)

| File | Responsibility |
|---|---|
| `calendarService.ts` | `.ics` parse (all-day only, expand multi-day, skip RRULE/timed), store/replace per location, `holidayDatesInRange` |
| `rosterService.ts` | master member CRUD, single-Scrum-Master invariant, seed |
| `settingsService.ts` | read settings, update the editable subset (validated) |
| `iterationService.ts` | iteration CRUD, participant copy on create, per-participant overrides (leave 0.5 steps, capacity %, add'l buffer, SM move, included), extra-assignment lifecycle (SM Activity auto, MAUI Review, Common Automation), `computeCapacity`, cascade delete |
| `taskService.ts` | task CRUD, role-validated Dev/QA assignment |
| `allocationService.ts` | per-person allocated/remaining/status, unassigned totals, pool allocation, `capexOpexSummary` |
| `reportService.ts` | cross-iteration planned-allocation report |
| `jiraService.ts` | Jira Cloud client — single-issue title/Capex lookup + sprint listing/import from `JIRA_BOARD_ID`; typed error mapping (bad URL / bad creds / no board / not found), `/myself` probe |
| `importService.ts` | `importSprint({sprintName, startDate?, endDate?})` — derives the iteration number from the sprint name, creates the iteration (sprint dates when present) + one Task per Jira issue (estimate → Dev hours, Capex/Opex from the Capex field); blocks re-importing an existing number |
| `excelExportService.ts` | 2-sheet `.xlsx` via exceljs, laid out to match the source spreadsheets: **"Iteration &lt;n&gt;"** (per-person capacity table — header block, Leave Plan, row-16 group headers, row-17 columns, per-person rows that reconcile, SUM formulas) + **"Time Allocation"** (Dev/QA capacity, task list A:E, Dev/QA buffer rows, Total/Remaining formulas) |

## Key invariants implemented

- Iterations are self-contained — `computeCapacity` reads only the iteration's own participants
  and copied holiday date lists, never the master roster/calendars. Verified by
  `iterationAllocation.test.ts` ("past iterations are unaffected by later roster changes").
- Ceremonies auto-zero when `personalLeaveDays >= netWorkingDays` (BR-CE2).
- SM Activity is an auto extra-assignment that follows the `isScrumMaster` participant.
- Dev buffer 16.5% (11 Capex + 5.5 Opex), QA buffer 19.5% (13 Capex + 6.5 Opex) — from
  `DEFAULT_SETTINGS.bufferConfig`, editable via Settings.

## Validation

`test/us11-iteration-205-validation.test.ts` reproduces the source sheet's Iteration 205
Dev pool (401.68925, within the documented row-23 variance) and QA pool (160.974, exact).
