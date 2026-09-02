# Business Rules — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Functional Design
Rules are grouped by area. `BR-x` identifiers are referenced from `business-logic-model.md`
and will be referenced again by tests.

---

## Roster (BR-R)

- **BR-R1** A `TeamMember` requires `name`, `role` (Dev|QA), `locationGroup` (SL|MY).
- **BR-R2** `capacityPercent` must be an integer 1–100. Default from `Settings.defaultCapacityPercent` (90). Arshad is seeded at 70.
- **BR-R3** `additionalDevBuffer` defaults to false. Seeded true only for Arshad.
- **BR-R4** Exactly one **active** member has `isScrumMaster = true`. **Seeded to Vihidun.**
  Setting it on member B clears it on the previous holder in the same operation. If the current
  SM is deactivated, `isScrumMaster` is cleared and the SM must be reassigned before a new
  iteration's SM Activity can be auto-created (the tool warns).
- **BR-R5** A member referenced by any iteration cannot be hard-deleted; it can only be deactivated. Deactivated members are excluded from **new** iterations but remain in past ones.
- **BR-R6** Editing a master `TeamMember` never alters existing iterations (BR-H1).

## Holiday calendars (BR-C)

- **BR-C1** Two calendars exist, keyed by `locationGroup` (SL, MY). Uploading replaces the one for that location.
- **BR-C2** Only **all-day** iCalendar events are counted. Timed events and recurring (RRULE) events are ignored (clarification Q7=A).
- **BR-C3** A multi-day all-day event is expanded to each individual date it spans.
- **BR-C4** An uploaded file that does not parse as iCalendar is rejected; the previously stored calendar is kept.
- **BR-C5** `holidayDatesInRange(location, start, end)` returns the **distinct** dates from that calendar that fall within `[start,end]` **and** on a Monday–Friday.
- **BR-C6** Weekend holidays never reduce working days (they are already non-working).

## Iteration lifecycle (BR-I)

- **BR-I1** `number` is proposed as `latestIteration.number + 1` (or 1 if none). The SM may change it. A duplicate `number` produces a non-blocking warning.
- **BR-I2** `endDate` must be ≥ `startDate`. On entering `startDate`, `endDate` is suggested as the Friday of the 3rd week (`startDate + 20` days if `startDate` is a Monday); the SM can change it.
- **BR-I3** On creation the tool **copies**:
  - every **active** `TeamMember` → an `IterationParticipant` (all attributes copied, `personalLeaveDays = 0`, `included = true`);
  - `Settings.defaultToleranceHours` → `Iteration.toleranceHours`;
  - `holidayDatesInRange('SL', start, end)` → `Iteration.holidayDatesSL`;
  - `holidayDatesInRange('MY', start, end)` → `Iteration.holidayDatesMY`;
  - one `sm-activity` `ExtraAssignment` for the SM participant (BR-X1).
  - `devBufferHours = 0`, `qaBufferHours = 0`.
- **BR-I3b** *(Jira sprint import)* An iteration can instead be created from a Jira sprint on
  the configured board (`JIRA_BOARD_ID`): the iteration `number` = the trailing integer in the
  sprint name ("Iteration 206" → 206); dates = the sprint's Jira dates when present, else the
  values supplied with the import, else a Mon→Fri-3-weeks suggestion; one `Task` per sprint
  issue — `title` = summary, `externalId` = key, `category` from the Capex field (BR-CX0),
  `devEstimateH` = the issue's Original Estimate in hours (Jira has no Dev/QA split — imported
  as Dev, split in the tool), `qaEstimateH` = 0. Blocked (409) if an iteration with that number
  already exists. Otherwise identical to a manually-created iteration (BR-I3 participant copy,
  SM Activity, etc.).
- **BR-I4** There is **no** close/reopen/clone. Every iteration stays editable forever.
- **BR-I5** Deleting an iteration cascades to its participants, extra assignments, and tasks.
- **BR-I6** Re-uploading a calendar does **not** refresh an existing iteration's copied holiday dates. (A future "refresh holidays for this iteration" action is out of scope.)

## Working days & leave (BR-W)

- **BR-W1** `calendarWorkingDays(start, end)` = count of Mon–Fri dates in `[start,end]` inclusive.
- **BR-W2** `netWorkingDays(participant)` = `calendarWorkingDays − |{holiday dates for participant.locationGroup that are Mon–Fri in the window}|`, using the iteration's **copied** holiday date lists.
- **BR-W3** `personWorkingDays(participant)` = `max(0, netWorkingDays − personalLeaveDays)`.
- **BR-W4** `personalLeaveDays` accepts 0.5 increments (half-days), must be ≥ 0. It is **not** clamped to `netWorkingDays` for input, but `personWorkingDays` is floored at 0.
- **BR-W5** `grossHours(participant)` = `personWorkingDays × Settings.hoursPerDay` (7).

## Ceremonies (BR-CE)

- **BR-CE1** Ceremonies apply to **every** participant; there is no manual exemption (clarification Q4).
- **BR-CE2** **Auto ceremony exclusion**: if `personalLeaveDays ≥ netWorkingDays(participant)` (i.e. leave covers the whole sprint), **all ceremony deductions are 0** for that participant (clarification B1=B). Extra assignments still apply.
- **BR-CE3** When not excluded, the ceremony deduction is:
  ```
  dailyScrum = personWorkingDays × Settings.ceremonies.dailyScrumPerWorkingDay   (0.25/day)
  fixed      = planning(1) + grooming(2) + retro(0.5) + demo(1.5) = 5
  ceremonyDeduction = dailyScrum + fixed
  ```
- **BR-CE4** `dailyScrum` is based on `personWorkingDays` (after leave), so partial leave automatically reduces the standup time (clarification Q4).
- **BR-CE5** There is no separate "MAUI Review" ceremony line — MAUI Review is an `ExtraAssignment` (BR-X3).

## Extra assignments (BR-X)

- **BR-X1** On iteration creation, one `sm-activity` `ExtraAssignment` is created for the SM participant: `opexHours = Settings.smActivityHours` (20), `capexHours = 0`. It is **fixed** in hours (editable only via Settings) and follows the `isScrumMaster` participant if the role is reassigned within the iteration.
- **BR-X2** The SM may add any number of `custom` assignments; each needs `participantId`, `label`, and non-negative `capexHours` / `opexHours`.
- **BR-X3** **MAUI Review**: adding one sets `kind = 'maui-review'`, `label = 'MAUI Review'`, `opexHours = Settings.defaultMauiReviewHours` (default 0, configurable), `capexHours = 0`. Editable. Not present by default.
- **BR-X4** **Common Automation**: adding one sets `kind = 'common-automation'`, `label = 'Common Automation'`, `capexHours = Settings.commonAutomation.capexHours` (20), `opexHours = Settings.commonAutomation.opexHours` (10). Editable. Assigned to a **QA** participant. **Not present by default** (clarification A2).
- **BR-X5** A participant's total extra-assignment hours = `Σ (capexHours + opexHours)`. This is **subtracted from their available hours** and shown as a line in their breakdown (clarification A3).
- **BR-X6** Extra assignments do not have to be QA/Dev-restricted except Common Automation (QA only, BR-X4).

## Capacity calculation (BR-CAP)

Applied per participant, in this order (full precision; see BR-CAP7 for rounding):

- **BR-CAP1** `grossHours` — BR-W5.
- **BR-CAP2** `ceremonyDeduction` — BR-CE2/CE3.
- **BR-CAP3** `bufferDeduction` = `grossHours × totalBufferPercent(role) / 100`, where
  `totalBufferPercent('Dev') = 16.5`, `totalBufferPercent('QA') = 19.5` (sum of the
  applicable `bufferConfig` lines' Capex% + Opex%).
- **BR-CAP4** `extraAssignmentHours` = Σ of this participant's extra-assignment `(capex+opex)` hours — BR-X5.
- **BR-CAP5** `remaining` = `grossHours − ceremonyDeduction − bufferDeduction − extraAssignmentHours` (floored at 0).
- **BR-CAP6** `capacityAdjusted` = `remaining × capacityPercent / 100`.
  `finalAvailable` = `additionalDevBuffer ? capacityAdjusted × (Settings.additionalDevBufferPercent/100) : capacityAdjusted`
  (so Arshad: `remaining × 0.70 × 0.50`).
- **BR-CAP7** All intermediate values are kept at full floating-point precision. Values shown in the UI/export are rounded to **2 decimal places**. Pool totals are validated against the source spreadsheet to **±0.5h**.

## Pools (BR-POOL)

- **BR-POOL1** `devPoolAvailable` = `Σ finalAvailable` over included participants with `role = 'Dev'`.
- **BR-POOL2** `qaPoolAvailable` = `Σ finalAvailable` over included participants with `role = 'QA'`.
- **BR-POOL3** `devPoolReserved` = `Iteration.devBufferHours`; `qaPoolReserved` = `Iteration.qaBufferHours`.
- **BR-POOL4** `devPoolAllocated` = `Σ task.devEstimateH` for tasks with an assigned Dev + `devPoolReserved`.
  `qaPoolAllocated` = `Σ task.qaEstimateH` for tasks with an assigned QA + `qaPoolReserved`.
- **BR-POOL5** `devPoolRemaining` = `devPoolAvailable − devPoolAllocated` (same for QA).

## Allocation & flags (BR-ALLOC)

- **BR-ALLOC1** `participant.allocated` = `Σ task.devEstimateH where assignedDev = participant` **+** `Σ task.qaEstimateH where assignedQa = participant`. (A participant only ever gets one side by role, but the rule is symmetric.)
- **BR-ALLOC2** `participant.remaining` = `participant.finalAvailable − participant.allocated`.
- **BR-ALLOC3** `participant.status`:
  - `remaining < −toleranceHours` → **Over**
  - `remaining > +toleranceHours` → **Under**
  - otherwise → **OK**
- **BR-ALLOC4** `unassignedDevHours` = `Σ task.devEstimateH where assignedDev is null`.
  `unassignedQaHours` = `Σ task.qaEstimateH where assignedQa is null`.
- **BR-ALLOC5** The manual `devBufferHours` / `qaBufferHours` are **not** shown against any
  individual — only in the pool view (BR-POOL4).
- **BR-ALLOC6** Any change to a task (create / edit estimate / assign / delete) causes
  allocation and flags to be recomputed on the next read; the UI re-fetches immediately
  (US-15).

## Capex / Opex summary (BR-CX)  — on screen only

- **BR-CX0** A task's `category` (Capex/Opex/none) can be set manually, or filled in
  automatically from Jira when the issue key is entered: the Jira **"Capex"** custom field —
  value **"Yes"** → `Capex`; **"No"**, blank, or field absent → `Opex`. The SM can still
  override it.
- **BR-CX1** Per iteration, compute:
  - **Buffer Capex** = `Σ participant grossHours × applicableCapexPercent(role)/100`
  - **Buffer Opex** = `Σ participant grossHours × applicableOpexPercent(role)/100`
    - Dev: Capex 11.0%, Opex 5.5%. QA: Capex 13.0%, Opex 6.5%.
  - **Extra-assignment Capex** = `Σ ExtraAssignment.capexHours`; **Extra-assignment Opex** = `Σ ExtraAssignment.opexHours`
  - **Task Capex** = `Σ (devEstimateH + qaEstimateH) for tasks with category = 'Capex'`
    **Task Opex** = same for `category = 'Opex'` (tasks with no category are excluded)
- **BR-CX2** `totalCapex` = buffer + extra + task Capex; `totalOpex` = buffer + extra + task Opex.
  Also show each as a % of `(totalCapex + totalOpex)`.
- **BR-CX3** The Capex/Opex summary appears **on screen only**, not in the Excel export (clarification C2).

## Excel export (BR-XL) — mirrors the source spreadsheets

- **BR-XL1** Workbook has **2 sheets**, laid out to match the originals (same column letters,
  header rows, merged group headers) so the file can be dropped in / compared:
  - **"Iteration &lt;n&gt;"** — the *Balancer Iteration Planning Sheet* per-person table.
  - **"Time Allocation"** — the *Balancer Time Allocation Sheet* task list + Dev/QA capacity header.
- **BR-XL2** *Iteration &lt;n&gt;* sheet:
  - Header block (A1..B11): Iteration No, Starting/Ending Date, SL Holidays / SL Working Days,
    Malaysia Holidays / Malaysia Working Days.
  - `Leave Plan` block (H1:J…): each person + their leave days.
  - `AB13`/`AC13` = **DEV** pool, `AB15`/`AC15` = **QA** pool (sum of the displayed per-person values).
  - Row 16 merged group headers: Discussions / Dev Buffer / Buffer / Common QA / Common Automation.
  - Row 17 column headers: Team Member, Working hours, Daily Scrum, Planning, Grooming, Retro,
    Demo, SM Activity, MAUI Review, Scrum ceremonies, Capex/Opex ×5 pairs, Total, Remaining,
    90% Capacity, Additional Dev Buffer.
  - Rows 18+: one per included participant (Dev rows first, then QA), each reconciling internally
    `Working hours − Total = Remaining`, `90% Capacity = Remaining × capacity%`,
    `Additional Dev Buffer = 90% Capacity × 50%` (only for flagged members).
  - Sum row (`SUM(...)` formulas), then `Tot Available(h)` and its 90% line.
- **BR-XL3** *Time Allocation* sheet: `B2`/`C2` = Dev/QA; `A4` **Capacity** row = the two pool
  totals (same as the Iteration sheet); `A6` **Remaining** = Capacity − Total (formula); `A9`
  Sprint Goal; task table `A12:E12` = Task / ID / Dev / QA / Capex-Opex, one row per task;
  then **Dev Buffer** (col C) and **QA buffer** (col D) rows; **Total** row = `SUM` formulas.
- **BR-XL4** Numbers rounded to 2 decimals (BR-CAP7). Column sums, the totals rows, and the
  Time-Allocation Total/Remaining are written as live `SUM` / arithmetic **formulas**. Export
  succeeds even with 0 tasks. File name `iteration-<number>.xlsx`.
- **BR-XL5** The Capex/Opex summary (BR-CX) is **not** in the export (screen only).

## Historical integrity (BR-H)

- **BR-H1** An iteration's numbers are derived **only** from its own `IterationParticipant`
  rows, its own copied holiday date lists, its own `ExtraAssignment`s, its own tasks, and the
  (rarely-changing) `Settings` constants. No master-roster or master-calendar read happens
  when viewing an existing iteration.
- **BR-H2** Because `Settings` values are global, changing a `Settings` constant *will* affect
  past iterations' recomputation. This is accepted; Settings changes are expected to be very
  rare. (If this becomes a problem, snapshotting Settings per iteration is a later enhancement.)
