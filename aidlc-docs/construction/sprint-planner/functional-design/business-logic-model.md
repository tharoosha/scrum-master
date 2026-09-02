# Business Logic Model — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Functional Design
Algorithms and workflows, technology-agnostic. Rule IDs (`BR-*`) refer to `business-rules.md`.

---

## 1. `.ics` parsing  (CalendarService)

```
parseIcs(icsText) -> HolidayEvent[]:
    events = iCalendar VEVENTs in icsText
    result = []
    for e in events:
        if e is not an all-day event: continue            # BR-C2 (skip timed)
        if e has RRULE: continue                           # BR-C2 (skip recurring)
        for d in each date from e.DTSTART (inclusive) to e.DTEND (exclusive):
            result.push({ date: d, summary: e.SUMMARY })   # BR-C3 (expand multi-day)
    return dedupeByDate(result)

uploadCalendar(location, fileName, icsText):
    parsed = parseIcs(icsText)          # throw ValidationError if icsText is not iCalendar
    upsert HolidayCalendar{ location, fileName, uploadedAt: now,
                            events: parsed, rawIcs: icsText }     # BR-C1, BR-C4
    return summary(location)            # { fileName, uploadedAt, eventCount, minDate, maxDate }

holidayDatesInRange(location, start, end) -> string[]:
    cal = HolidayCalendar[location]  (or empty)
    return sorted distinct d in cal.events.date
           where start <= d <= end AND weekday(d) in Mon..Fri      # BR-C5, BR-C6
```

---

## 2. Working days  (WorkingDaysCalculator — pure)

```
calendarWorkingDays(start, end):                                  # BR-W1
    return count of dates d in [start, end] where weekday(d) in Mon..Fri

netWorkingDays(start, end, holidayDates):                         # BR-W2
    hol = { d in holidayDates : start <= d <= end and weekday(d) in Mon..Fri }
    return calendarWorkingDays(start, end) - size(hol)

personWorkingDays(netWorkingDays, personalLeaveDays):             # BR-W3, BR-W4
    return max(0, netWorkingDays - personalLeaveDays)

grossHours(personWorkingDays, hoursPerDay = 7):                   # BR-W5
    return personWorkingDays * hoursPerDay
```

---

## 3. Capacity engine  (CapacityEngine — pure)

### 3.1 Per-participant breakdown

```
personBreakdown(p, iteration, settings, extraAssignmentsForP) -> Breakdown:

    net   = netWorkingDays(iteration.start, iteration.end,
                           iteration.holidayDates[p.locationGroup])
    pwd   = personWorkingDays(net, p.personalLeaveDays)
    gross = grossHours(pwd, settings.hoursPerDay)

    # --- ceremonies (BR-CE) ---
    if p.personalLeaveDays >= net:            # leave covers whole sprint -> BR-CE2
        ceremony = 0
    else:
        dailyScrum = pwd * settings.ceremonies.dailyScrumPerWorkingDay      # 0.25/day
        ceremony   = dailyScrum + 1 + 2 + 0.5 + 1.5                          # BR-CE3  (= dailyScrum + 5)

    # --- % buffers (BR-CAP3) ---
    bufferPct   = (p.role == 'Dev') ? 16.5 : 19.5
    bufferHours = gross * bufferPct / 100

    # --- extra assignments (BR-X5 / BR-CAP4) ---
    extra = sum(a.capexHours + a.opexHours for a in extraAssignmentsForP)

    # --- remaining & capacity (BR-CAP5/CAP6) ---
    remaining        = max(0, gross - ceremony - bufferHours - extra)
    capacityAdjusted = remaining * p.capacityPercent / 100
    finalAvailable   = p.additionalDevBuffer
                         ? capacityAdjusted * settings.additionalDevBufferPercent / 100   # * 0.50
                         : capacityAdjusted

    return {
      participantId: p.id, name: p.name, role: p.role, locationGroup: p.locationGroup,
      netWorkingDays: net, personalLeaveDays: p.personalLeaveDays,
      personWorkingDays: pwd, grossHours: gross,
      ceremonyDeduction: ceremony, bufferDeduction: bufferHours,
      extraAssignmentHours: extra,
      remaining, capacityPercent: p.capacityPercent, capacityAdjusted,
      additionalDevBuffer: p.additionalDevBuffer, finalAvailable
    }
```

All arithmetic at full precision; rounding is a presentation concern (BR-CAP7).

### 3.2 Pools

```
pools(breakdowns, iteration):                                     # BR-POOL
    devPoolAvailable = sum(b.finalAvailable for b where b.role == 'Dev' and b.included)
    qaPoolAvailable  = sum(b.finalAvailable for b where b.role == 'QA' and b.included)
    return { devPoolAvailable, qaPoolAvailable,
             devPoolReserved: iteration.devBufferHours,
             qaPoolReserved:  iteration.qaBufferHours }
```

---

## 4. Allocation  (AllocationService)

```
allocation(iterationId):                                          # BR-ALLOC
    caps  = capacity(iterationId)                # breakdowns + pools (snapshot-free; always live)
    tasks = TaskService.listTasks(iterationId)
    tol   = iteration.toleranceHours

    for each participant b in caps.breakdowns where b.included:
        allocated = sum(t.devEstimateH for t in tasks if t.assignedDevParticipantId == b.participantId)
                  + sum(t.qaEstimateH  for t in tasks if t.assignedQaParticipantId  == b.participantId)
        remaining = b.finalAvailable - allocated
        status    = remaining < -tol ? 'Over'
                  : remaining >  tol ? 'Under'
                  : 'OK'
        emit { participantId, name, role, locationGroup,
               available: b.finalAvailable, allocated, remaining, status }

unassigned(iterationId):
    devHours = sum(t.devEstimateH for t in tasks if t.assignedDevParticipantId is null)
    qaHours  = sum(t.qaEstimateH  for t in tasks if t.assignedQaParticipantId  is null)

poolAllocation(iterationId):
    devAllocated = sum(t.devEstimateH for t with assignedDev) + iteration.devBufferHours
    qaAllocated  = sum(t.qaEstimateH  for t with assignedQa)  + iteration.qaBufferHours
    return {
      dev: { available: devPoolAvailable, allocated: devAllocated, remaining: devPoolAvailable - devAllocated },
      qa:  { available: qaPoolAvailable,  allocated: qaAllocated,  remaining: qaPoolAvailable  - qaAllocated  }
    }
```

**Reactivity (US-15)**: no server-side caching of allocation — every `GET /allocation` recomputes
from current data (cheap: ≤ ~15 participants, ≤ ~80 tasks). The UI re-fetches after each task
mutation so both the edited participant and any re-assignee update at once.

---

## 5. Capex / Opex summary  (AllocationService.capexOpexSummary — screen only, BR-CX)

```
capexOpexSummary(iterationId):
    bufCapex = 0; bufOpex = 0
    for b in breakdowns where b.included:
        (cPct, oPct) = b.role == 'Dev' ? (11.0, 5.5) : (13.0, 6.5)
        bufCapex += b.grossHours * cPct / 100
        bufOpex  += b.grossHours * oPct / 100

    extraCapex = sum(a.capexHours for a in iteration.extraAssignments)
    extraOpex  = sum(a.opexHours  for a in iteration.extraAssignments)

    taskCapex = sum(t.devEstimateH + t.qaEstimateH for t in tasks if t.category == 'Capex')
    taskOpex  = sum(t.devEstimateH + t.qaEstimateH for t in tasks if t.category == 'Opex')

    totalCapex = bufCapex + extraCapex + taskCapex
    totalOpex  = bufOpex  + extraOpex  + taskOpex
    return { totalCapex, totalOpex,
             capexPct: totalCapex / (totalCapex + totalOpex),
             opexPct:  totalOpex  / (totalCapex + totalOpex),
             breakdown: { bufCapex, bufOpex, extraCapex, extraOpex, taskCapex, taskOpex } }
```

---

## 6. Iteration creation & editing  (IterationService)

```
createIteration({ number?, startDate, endDate }):                 # BR-I1..I3
    number   = number ?? (latestIteration?.number + 1 ?? 1)
    tol      = settings.defaultToleranceHours
    holSL    = CalendarService.holidayDatesInRange('SL', startDate, endDate)
    holMY    = CalendarService.holidayDatesInRange('MY', startDate, endDate)
    iteration = insert Iteration{ number, startDate, endDate, toleranceHours: tol,
                                  devBufferHours: 0, qaBufferHours: 0,
                                  holidayDatesSL: holSL, holidayDatesMY: holMY }
    for m in RosterService.listMembers({ activeOnly: true }):
        insert IterationParticipant{ iterationId, sourceMemberId: m.id,
            name: m.name, role: m.role, locationGroup: m.locationGroup,
            capacityPercent: m.capacityPercent, additionalDevBuffer: m.additionalDevBuffer,
            isScrumMaster: m.isScrumMaster, personalLeaveDays: 0, included: true }
    sm = participant where isScrumMaster
    if sm: insert ExtraAssignment{ iterationId, participantId: sm.id, kind: 'sm-activity',
                                   label: 'SM Activity', opexHours: settings.smActivityHours, capexHours: 0 }
    else: warn("No Scrum Master set — SM Activity not added")
    return getIteration(iteration.id)

setParticipant(iterationId, participantId, patch):
    # patch may set personalLeaveDays (>=0, .5 steps), capacityPercent, additionalDevBuffer,
    #   isScrumMaster, included
    if patch.isScrumMaster == true:
        clear isScrumMaster on all other participants of this iteration
        move the 'sm-activity' ExtraAssignment to this participant (BR-X1)
    apply patch; validate; save

addExtraAssignment(iterationId, { participantId, kind }):
    defaults by kind:
        'maui-review'       -> label 'MAUI Review',       opex settings.defaultMauiReviewHours, capex 0
        'common-automation' -> label 'Common Automation', capex 20, opex 10   (participant must be QA)
        'custom'            -> label '', capex 0, opex 0
    insert; return

deleteIteration(id): cascade delete participants, extraAssignments, tasks    # BR-I5
```

*No* `closeIteration`, `reopenIteration`, or `cloneIteration` (BR-I4).

---

## 7. Task workflow  (TaskService)

```
createTask(iterationId, { title, externalId?, devEstimateH=0, qaEstimateH=0, category?, notes? }):
    validate estimates >= 0
    insert Task

updateTask(taskId, patch): validate; save
deleteTask(taskId): remove; (allocation recomputes on next read)

assignTask(taskId, { devParticipantId?, qaParticipantId? }):      # BR-ALLOC, domain-entities §7
    if devParticipantId: assert participant exists in this iteration and role == 'Dev'
    if qaParticipantId:  assert participant exists in this iteration and role == 'QA'
    set assignedDevParticipantId / assignedQaParticipantId (null clears)
    save
```

---

## 8. Excel export  (ExcelExportService — BR-XL)

Workbook `iteration-<number>.xlsx`:

| Sheet | Columns |
|---|---|
| **Capacity** | Name, Role, Location, Net working days, Leave (d), Person working days, Gross h, Ceremony h, Buffer h, Extra assignment h, Remaining h, Capacity %, Capacity-adjusted h, Additional Dev Buffer, **Final available h**. Footer rows: Dev pool available, QA pool available, Dev buffer (manual), QA buffer (manual). |
| **Allocation** | Name, Role, Available h, Allocated h, Remaining h, Status. Footer: Dev pool available/allocated/remaining, QA pool available/allocated/remaining, Unassigned Dev h, Unassigned QA h. |
| **Tasks** | Title, External ID, Dev est h, QA est h, Category, Assigned Dev, Assigned QA, Notes. |

All numbers rounded to 2 dp. The Capex/Opex summary is **not** exported (BR-CX3).

---

## 9. Worked examples & validation (from the source *Iteration Planning Sheet*, Iteration 205)

The engine must reproduce the source sheet. Verified by hand against Iteration 205 rows:

### 9.1 Standard SL Dev, no leave, not SM  (sheet row 25)
```
netWorkingDays        = 13        (15 weekday dates − 2 SL holidays in window)
personalLeaveDays     = 0
personWorkingDays     = 13
grossHours            = 13 × 7                     = 91
ceremonyDeduction     = 13 × 0.25 + 5             = 3.25 + 5 = 8.25
bufferDeduction       = 91 × 16.5%               = 15.015
extraAssignmentHours  = 0
remaining             = 91 − 8.25 − 15.015       = 67.735      ✓ sheet AA25 = 67.735
capacityAdjusted (90%)= 67.735 × 0.90            = 60.9615     ✓ sheet AB25 = 60.9615
finalAvailable        = 60.9615
```

### 9.2 Arshad — Malaysia Dev, 70% + Additional Dev Buffer  (sheet row 18)
```
grossHours            = 91
ceremonyDeduction     = 8.25
bufferDeduction       = 91 × 16.5%               = 15.015
remaining             = 67.735
capacityAdjusted (70%)= 67.735 × 0.70            = 47.4145     ✓ sheet AB18 = 47.4145
finalAvailable        = 47.4145 × 0.50           = 23.70725    ✓ sheet AC18 = 23.70725
```

### 9.3 Scrum Master — SL Dev with SM Activity  (sheet row 21)
```
grossHours            = 12 × 7                    = 84
ceremonyDeduction     = 12 × 0.25 + 5            = 8
extraAssignmentHours  = 20   (SM Activity, opex)
bufferDeduction       = 84 × 16.5%              = 13.86
remaining             = 84 − 8 − 13.86 − 20     = 42.14        ✓ sheet AA21 = 42.14
capacityAdjusted (90%)= 42.14 × 0.90            = 37.926       ✓ sheet AB21 = 37.926
```

### 9.4 Pool validation (acceptance test US-11)
Load the real Iteration 204 and 205 rosters, dates, leave and holiday calendars as fixtures;
assert `devPoolAvailable` and `qaPoolAvailable` match the sheet's Dev/QA totals within **±0.5h**.

**Known accepted variance**: the source sheet has one participant with *all ceremonies = 0*
while working full days (sheet row 23, ~8.25h). The new rule (BR-CE1/CE2) only zeroes
ceremonies when leave covers the whole sprint, so the tool's pool total for that historical
iteration is expected to be **~8.25h lower** than the sheet. The test tolerance for 204/205 is
widened to **±9h on the pool** (or the row-23 participant is excluded from the fixture) and this
is documented, per the user's decision that the new rule is the correct one going forward.
