# Functional Design Plan — Unit: `sprint-planner`

**Stage**: CONSTRUCTION → Functional Design
**Unit**: `sprint-planner` (the whole application — single unit)
**Inputs**: `requirements/requirements.md` (esp. §7), `application-design/*`, `user-stories/stories.md`

Functional Design pins down the **business logic, domain rules, algorithms and validation** —
technology-agnostic. Most of it is already specified in requirements §7; the questions below
close the remaining gaps (the assumptions A1–A7 and the items listed in
`application-design.md` §8).

Please answer every `[Answer]:` tag, then tell me you're done. I'll check for ambiguity, then
generate the functional design artifacts (no further approval gate before generation).

---

## Part A — What is already fixed (from requirements §7, no questions)

- Working day = 7h; work week Mon–Fri.
- Ceremonies: Daily Scrum `netWorkingDays × 0.25`; Planning 1h; Grooming 2h; Retro 0.5h; Demo 1.5h.
- SM Activity: 20h, only the one Scrum Master.
- Capacity factor: 70% Arshad, 90% everyone else.
- Additional Dev Buffer: 50%, only Arshad.
- Formula order: gross → − ceremonies → − buffers → remaining → × capacity% → (× 50% if Additional Dev Buffer) → final available.
- Flags: `remaining < −tolerance` → Over; `> +tolerance` → Under; else OK. Default tolerance 4h.
- Closed iterations are frozen via a snapshot.

---

## Part B — Questions

### Question 1 — Confirm the buffer percentages (assumption A1)

From the source *Iteration Planning Sheet* I derived these buffer deductions as **% of gross hours**:

| Buffer line | Dev | QA |
|---|---|---|
| Dev Buffer | 5.0% | 5.0% |
| (Opex 2.5%) | 2.5% | 2.5% |
| (Capex 3%) | 3.0% | — |
| (Opex 1.5%) | 1.5% | — |
| (Capex 3% / QA 5%) | 3.0% | 5.0% |
| (Opex 1.5% / QA 2.5%) | 1.5% | 2.5% |
| **Total buffer** | **16.5%** | **19.5%** |

Is this correct?

A) Yes — Dev buffer total **16.5%** of gross hours, QA buffer total **19.5%** of gross hours

B) Yes on the totals, but I'll give you the exact line-by-line breakdown to store (add after [Answer]:)

C) No — the correct percentages are: (describe after [Answer]:)

D) Just reproduce whatever the current sheet does; the total % is what matters, not the individual lines

X) Other (please describe after [Answer]: tag below)

[Answer]:C Discussion (Capex - 5%, Opex - 2.5%), dev Buffer (Capex 3%dev- ,Opex -1.5%dev), Buffer (Capex - 3%, Opex -1.5%), Common QA (Capex 0%dev 5%QA, Opex - 0%dev 2.5%QA), Common Automation(capex - QA 20hours some sprint we consider this some sprint we remove this, Opex 0hours)

### Question 2 — Are the buffer % the same for every Dev and every QA?

A) Yes — one Dev % for all Devs, one QA % for all QAs (no per-person variation)

B) No — some people have different buffer % (describe who / what after [Answer]:)

X) Other (please describe after [Answer]: tag below)

[Answer]:A

### Question 3 — Personal leave: whole days only, or half-days too?

A) Whole days only

B) Allow half-days (0.5 increments)

X) Other (please describe after [Answer]: tag below)

[Answer]:B

### Question 4 — "Does not attend ceremonies" override

When a person is marked as not attending ceremonies for an iteration, which deductions become 0?

A) All ceremony lines become 0 (Daily Scrum, Planning, Grooming, Retro, Demo, MAUI Review) — SM Activity still applies if they are the SM

B) Only the meeting ceremonies (Planning, Grooming, Retro, Demo) become 0; Daily Scrum still deducted

C) Other (please describe after [Answer]: tag below)

[Answer]: no one can marked as not attending ceremonies for an iteration. Daily Scrum is 15min daily. if they are taking leave then they missed that amount of Daily scrum. Planning, Grooming and Retro and Demo, MAUI review can't be decide. so no need to varity the time baed on those

### Question 5 — Rounding

A) Keep full precision internally; round only for **display** to 2 decimal places; pool totals validated to ±0.5h

B) Round every intermediate line to 2 decimals as you go (like a spreadsheet might)

C) No preference — you choose (I recommend **A**)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 6 — Default reserve/buffer lines for a new iteration

From the *Time Allocation Sheet* I see: **Dev Buffer**, **QA buffer**, **Move to backlog**, **Add risk list**.
For a new iteration, pre-create these with **0 hours** (SM fills them in)?

A) Yes — pre-create those 4 lines at 0h, SM edits as needed

B) Pre-create them, but carry the hours forward from the previous iteration as a starting guess

C) Don't pre-create any — SM adds reserve lines manually

D) Other (please describe after [Answer]: tag below)

[Answer]: dont need move to back log and add risk list thing. we can get total dev buffer and qa buffer and total time would be enought. 

### Question 7 — `.ics` parsing scope

Public-holiday `.ics` files are normally all-day, one-off events. How should parsing behave?

A) Count **all-day events only**; expand multi-day spans to each weekday; **ignore** timed events and recurring (RRULE) events

B) Same as A, but also expand recurring events within the calendar year

C) Other (please describe after [Answer]: tag below)

[Answer]:A

### Question 8 — Clone iteration: which per-person overrides carry over?

When cloning a past iteration as the basis for a new one:

A) Carry over `MAUI Review hours` and `does not attend ceremonies`; reset personal leave to 0; copy reserve-line labels at 0h; no tasks

B) Reset everything per-person to defaults (leave 0, MAUI 0, attends ceremonies = true); copy reserve-line labels at 0h; no tasks

C) Other (please describe after [Answer]: tag below)

[Answer]: No need to close the iteration. we creating a new interation create is as default. then we can adjust it what we want

### Question 9 — What defines the sprint's working-day window?

A) The **start and end dates**, inclusive; Mon–Fri within that range are working days

B) A separate "number of working days" value the SM types (dates are just labels)

C) Other (please describe after [Answer]: tag below)

[Answer]:A normally sprint is 3 weeks. Start from monday finished at friday

### Question 10 — Iteration numbers

A) SM types the iteration number freely (e.g. 206); tool warns on duplicates but allows it

B) Tool auto-increments from the last iteration; SM can override

C) Other (please describe after [Answer]: tag below)

[Answer]:B

### Question 11 — Frontend: the Iteration Workspace layout

The main screen shows capacity + tasks + allocation for one iteration. Preferred layout?

A) **Tabs** within the workspace (Leave & Overrides | Capacity | Tasks | Allocation Review) — less scrolling

B) **One long scrolling page** with all panels stacked — everything visible at once

C) **Two-pane**: task list on the left, per-person allocation always visible on the right

D) No preference — you choose (I recommend **C**, so the SM sees allocation update as they assign)

X) Other (please describe after [Answer]: tag below)

[Answer]:A

### Question 12 — Any additional validation or business rules you want enforced?

A) None beyond what's in requirements §7 and the stories

B) Yes (describe after [Answer]:) — e.g. "warn if total assigned Dev hours exceed Dev pool by more than X%", "block closing an iteration with unassigned task hours", etc.

X) Other (please describe after [Answer]: tag below)

[Answer]:A

---

## Part C — Execution checklist (runs after answers, no approval gate)

- [x] C1. Resolved answers over 3 clarification rounds (buffer structure, ceremonies, extra assignments, no-close history model, capex/opex)
- [x] C2. Wrote `domain-entities.md` (Settings, TeamMember, HolidayCalendar, Iteration, IterationParticipant, ExtraAssignment, Task; self-contained iteration model)
- [x] C3. Wrote `business-rules.md` (BR-R/C/I/W/CE/X/CAP/POOL/ALLOC/CX/XL/H)
- [x] C4. Wrote `business-logic-model.md` (algorithms + §9 worked examples from Iteration 205, verified against sheet rows 18/21/25)
- [x] C5. Wrote `frontend-components.md` (tabbed Iteration Workspace, component tree, state, flows, validation, endpoint map)
- [x] C6. Worked-example validation table included (§9 of business-logic-model.md) with the known accepted variance for the row-23 case
- [x] C7. Present completion message
