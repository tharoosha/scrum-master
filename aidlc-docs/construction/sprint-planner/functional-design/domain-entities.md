# Domain Entities — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Functional Design
Technology-agnostic domain model. Persistence mapping (lowdb JSON collections) is in
Application Design; this document is about concepts, fields, and relationships.

Dates are date-only `YYYY-MM-DD`. Hours are decimal numbers. IDs are opaque strings.

---

## Entity overview

```
Settings (singleton)

TeamMember (master roster)            HolidayCalendar (master, one per LocationGroup)
      |                                      |
      |  copied at iteration creation        |  holiday dates copied at iteration creation
      v                                      v
Iteration 1 ── * IterationParticipant ──── * ExtraAssignment
      |                 ^      ^
      |                 |      |
      * Task  ──────────+      +  (assignedDev / assignedQa)
```

An **Iteration is self-contained**: once created it holds its own copy of the participants and
of the holiday dates it uses. Editing the master roster or uploading a new calendar later does
**not** change existing iterations (clarification 4a). There is no "close"/"open" state and no
clone step (clarification, Q8).

---

## 1. Settings (singleton)

Global configuration and calculation constants. Editable values are marked ✎.

| Field | Type | Default | Notes |
|---|---|---|---|
| `hoursPerDay` | number | 7 | fixed |
| `defaultCapacityPercent` | number | 90 | ✎ applied to new participants (Arshad seeded at 70) |
| `defaultToleranceHours` | number | 4 | ✎ copied into each new Iteration |
| `ceremonies.dailyScrumPerWorkingDay` | number | 0.25 | fixed — 15 min/day |
| `ceremonies.planning` | number | 1 | fixed |
| `ceremonies.grooming` | number | 2 | fixed |
| `ceremonies.retro` | number | 0.5 | fixed |
| `ceremonies.demo` | number | 1.5 | fixed |
| `smActivityHours` | number | 20 | ✎ hours auto-charged to the Scrum Master |
| `defaultMauiReviewHours` | number | 0 | ✎ used when the SM adds a MAUI Review assignment |
| `commonAutomation.capexHours` | number | 20 | ✎ used when the SM adds a Common Automation assignment |
| `commonAutomation.opexHours` | number | 10 | ✎ |
| `bufferConfig` | BufferConfig | see below | ✎ percentages of a person's gross hours |
| `additionalDevBufferPercent` | number | 50 | ✎ the extra ×50% for flagged members |

### BufferConfig

Each buffer line has a **Capex %** and an **Opex %** of the person's gross hours, and a list
of roles it applies to.

| Line key | Capex % | Opex % | Applies to |
|---|---|---|---|
| `discussion` | 5.0 | 2.5 | Dev, QA |
| `devBuffer` | 3.0 | 1.5 | Dev |
| `buffer` | 3.0 | 1.5 | Dev, QA |
| `commonQa` | 5.0 | 2.5 | QA |

→ Dev total buffer = **11.0% Capex + 5.5% Opex = 16.5%**
→ QA total buffer = **13.0% Capex + 6.5% Opex = 19.5%**

---

## 2. TeamMember (master roster)

The canonical team list. Used as the template when creating an iteration.

| Field | Type | Rules |
|---|---|---|
| `id` | string | |
| `name` | string | required, unique among active members |
| `role` | `'Dev' \| 'QA'` | required |
| `locationGroup` | `'SL' \| 'MY'` | required — decides which holiday calendar applies |
| `capacityPercent` | number | 1–100, default from Settings (Arshad = 70) |
| `additionalDevBuffer` | boolean | default false (true only for Arshad) |
| `isScrumMaster` | boolean | **exactly one** active member is true |
| `active` | boolean | inactive members are excluded from new iterations, kept for history |

**Seed data** (first run): Arshad *(Dev, MY, 70, additionalDevBuffer=true)*, Meng *(Dev, MY)*,
Ameerah *(Dev, MY)*, Prasanna *(Dev, SL)*, Tharindu *(Dev, SL)*, Vihidun *(Dev, SL)*,
Thilina *(Dev, SL)*, Chamath *(Dev, SL)*, Ishara *(QA, SL)*, Sandun *(QA, SL)*, Charitha *(QA, SL)*.
All except Arshad: capacityPercent = 90, additionalDevBuffer = false.
**`isScrumMaster` defaults to Vihidun** (reassignable in the app at any time).

---

## 3. HolidayCalendar (master, one per LocationGroup)

| Field | Type | Notes |
|---|---|---|
| `locationGroup` | `'SL' \| 'MY'` | primary key |
| `sourceFileName` | string | last uploaded file name |
| `uploadedAt` | datetime | |
| `events` | `HolidayEvent[]` | parsed: all-day events only, multi-day expanded to individual dates |
| `rawIcs` | string | retained for re-parse / audit |

`HolidayEvent = { date: 'YYYY-MM-DD', summary: string }`

Replacing a calendar overwrites the row for that location. Existing iterations are unaffected
(they hold their own copied holiday dates).

---

## 4. Iteration

| Field | Type | Rules |
|---|---|---|
| `id` | string | |
| `number` | integer | auto-incremented from the latest iteration; SM may override; duplicates warned but allowed |
| `startDate` | date | expected Monday; not enforced |
| `endDate` | date | ≥ startDate; suggested = startDate + 3 weeks − weekend (Friday) |
| `toleranceHours` | number | copied from `Settings.defaultToleranceHours`, editable |
| `devBufferHours` | number | ≥ 0, default 0 — manual pool reserve for unplanned Dev work (clarification 3a) |
| `qaBufferHours` | number | ≥ 0, default 0 — manual pool reserve for unplanned QA work |
| `holidayDatesSL` | `string[]` | SL holiday dates within `[startDate,endDate]` copied from the SL calendar at creation |
| `holidayDatesMY` | `string[]` | MY holiday dates within `[startDate,endDate]` copied at creation |
| `createdAt` | datetime | |

There is no `status` field. An iteration is always editable.

---

## 5. IterationParticipant

A per-iteration **copy** of a TeamMember plus that iteration's leave. This is what the capacity
engine reads — never the master roster.

| Field | Type | Rules |
|---|---|---|
| `id` | string | |
| `iterationId` | string | |
| `sourceMemberId` | string | link back to the TeamMember (may become inactive later) |
| `name` | string | copied |
| `role` | `'Dev' \| 'QA'` | copied |
| `locationGroup` | `'SL' \| 'MY'` | copied |
| `capacityPercent` | number | copied, editable within the iteration |
| `additionalDevBuffer` | boolean | copied, editable within the iteration |
| `isScrumMaster` | boolean | copied from the roster at creation, editable within the iteration |
| `personalLeaveDays` | number | ≥ 0, **0.5 increments allowed** (clarification, Q3), default 0 |
| `included` | boolean | default true; SM can drop someone from an iteration without deleting history |

**Derived / not stored** (computed on read, may be cached): the full capacity breakdown
(see `business-logic-model.md`).

---

## 6. ExtraAssignment

Extra hours charged to **one participant** for the iteration — the unified model for
**SM Activity**, **MAUI Review**, and **Common Automation** (clarification A1).

| Field | Type | Rules |
|---|---|---|
| `id` | string | |
| `iterationId` | string | |
| `participantId` | string | the person carrying the work |
| `label` | string | `'SM Activity' \| 'MAUI Review' \| 'Common Automation'` (free text allowed) |
| `capexHours` | number | ≥ 0 |
| `opexHours` | number | ≥ 0 |
| `kind` | `'sm-activity' \| 'maui-review' \| 'common-automation' \| 'custom'` | drives defaults & auto-management |

**Rules**
- On iteration creation, **one** `sm-activity` assignment is auto-created for the participant
  whose `isScrumMaster` is true: `opexHours = Settings.smActivityHours` (20), `capexHours = 0`.
- If `isScrumMaster` is reassigned within the iteration, the `sm-activity` assignment moves to
  the new participant.
- **MAUI Review**: SM adds one, picks the participant; `opexHours` defaults to
  `Settings.defaultMauiReviewHours`, `capexHours = 0`; editable. Not created by default.
- **Common Automation**: SM adds one, picks a QA participant; defaults
  `capexHours = 20`, `opexHours = 10`; editable. **Off (not created) by default** for a new
  iteration (clarification A2).
- Total extra hours for a participant = Σ `(capexHours + opexHours)` — subtracted from their
  available hours and shown as a line in their breakdown (clarification A3).

---

## 7. Task

| Field | Type | Rules |
|---|---|---|
| `id` | string | |
| `iterationId` | string | |
| `title` | string | required |
| `externalId` | string | free text, e.g. `AB-12510`; optional |
| `devEstimateH` | number | ≥ 0, default 0 |
| `qaEstimateH` | number | ≥ 0, default 0 |
| `category` | `'Capex' \| 'Opex' \| null` | optional; feeds the Capex/Opex summary (clarification C1) |
| `assignedDevParticipantId` | string \| null | must reference a `Dev` participant in the same iteration |
| `assignedQaParticipantId` | string \| null | must reference a `QA` participant in the same iteration |
| `notes` | string | optional |

---

## Relationships & integrity

| Rule | Enforced by |
|---|---|
| Exactly one active `TeamMember.isScrumMaster` | RosterService on create/update/setScrumMaster |
| Exactly one `IterationParticipant.isScrumMaster` per iteration | IterationService |
| `Task.assignedDev*` → a `Dev` participant of the same iteration; `assignedQa*` → a `QA` participant | TaskService |
| Deleting a `TeamMember` blocked if referenced by any iteration → deactivate instead | RosterService |
| Deleting an `IterationParticipant` also removes their `ExtraAssignment`s and clears their task assignments | IterationService |
| Deleting an `Iteration` cascades to its participants, extra assignments, and tasks | IterationService |
| `personalLeaveDays`, estimates, buffer hours, `capacityPercent` bounds | field validation in the owning service |
