# Story Generation Plan — Sprint Time Allocation / Scrum Master Software

**Stage**: INCEPTION → User Stories → Part 1: Planning
**Assessment**: `user-stories-assessment.md` — decision = Execute (Yes)
**Inputs**: `aidlc-docs/inception/requirements/requirements.md`

This plan defines **how** requirements will be converted into user stories and personas.
Please answer every `[Answer]:` tag below, then tell me you're done. I will analyse the
answers for ambiguity before asking for approval. No stories are written until you approve.

---

## Part A — Proposed Approach (for your review)

### A.1 Personas (proposed)
| Persona | Role in the tool |
|---|---|
| **Scrum Master** | Primary user. One person holds this at a time. Manages roster, holiday calendars, iterations, tasks, assignments; reviews allocation; exports. |
| **Team Lead** | Secondary user. Reviews and adjusts task assignments; reads allocation and reports. |
| **Team Member** | Lightweight future persona. Read-only view of their own allocation. Not a launch requirement. |

### A.2 Proposed story groups (Feature-Based breakdown)
1. **Team Roster & Configuration** — members, roles, location groups, capacity %, Additional Dev Buffer, Scrum Master designation, allocation tolerance.
2. **Holiday Calendars** — upload/replace SL & Malaysia `.ics`, parse summary, per-location holiday resolution.
3. **Iteration Setup** — create iteration (number, dates), record per-person leave & per-person overrides (MAUI Review, "does not attend ceremonies").
4. **Capacity Calculation** — per-person available-hours breakdown, Dev pool / QA pool totals, validation against a historical iteration.
5. **Tasks & Assignment** — add/edit/delete tasks with Dev/QA estimates, assign each side to a person, reserve lines.
6. **Allocation Review** — per-person available vs allocated vs remaining, Over/Under/OK flags, unassigned-hours surfacing, aggregate pool view.
7. **History & Reporting** — retain iterations, clone/reopen, cross-iteration report, planned-vs-actual (optional actuals entry).
8. **Excel Export** — export iteration plan + allocation in a spreadsheet-familiar layout.

### A.3 Story format (proposed)
`As a <persona>, I want <capability>, so that <benefit>.`
Plus: acceptance criteria in **Given / When / Then** form; INVEST-checked; each story tagged with its group and mapped to personas.

### A.4 Worked-example criteria (proposed)
Capacity-calculation stories will include concrete numeric acceptance criteria taken from
**Iteration 204 and/or 205** of the supplied sheets (e.g. "Dev pool = 401.7h ±0.5h for Iteration 205").

---

## Part B — Questions

## Question 1
Do you agree with the **Feature-Based** story breakdown in A.2, or would you prefer a different organisation?

A) Feature-Based as proposed (8 groups above)

B) User Journey-Based (stories follow end-to-end flows: "plan a new sprint", "rebalance mid-sprint", "close & report")

C) Epic-Based (each group above becomes an epic with child stories)

D) Hybrid — Feature-Based groups, but also add 2–3 top-level journey epics that tie them together

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
What **granularity / size** do you want for stories?

A) Fine-grained — one story per screen action / rule (more stories, each small and directly testable)

B) Medium — one story per meaningful capability (e.g. "manage team roster" as one story with several acceptance criteria)

C) Coarse — one story per feature group, with detailed acceptance criteria doing the heavy lifting

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
Confirm the **personas**. Should "Team Lead" be a distinct persona, or is the Scrum Master the only real user for the first release?

A) Keep all three (Scrum Master, Team Lead, Team Member) — Team Member marked as future

B) Just Scrum Master and Team Lead

C) Scrum Master only — collapse everything into one persona for now

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 4
For the **capacity-calculation** stories, how much numeric detail do you want in acceptance criteria?

A) Full worked examples from a real iteration (204/205) — exact expected numbers for each line and the pool totals

B) Formula-level criteria only (state the formula and one simple example), leave exhaustive numbers to test cases later

C) Both — formula-level in the story, plus a referenced worked example table

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
Should stories include **priority / release ordering** (e.g. MoSCoW or "MVP vs later"), or just the story content?

A) Yes — tag each story Must / Should / Could, and mark an MVP subset

B) Yes — simple "MVP" vs "Later" flag only

C) No — priority is decided in Workflow Planning, keep stories priority-free

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6
Are there **user workflows or rules not yet captured** in the requirements that stories should cover? (tick any that apply — you can pick more than one letter)

A) Editing a task's estimate *after* it's assigned should immediately update that person's allocation & flag

B) Warn when a person is assigned work while they have leave covering part of the sprint

C) Ability to move a task's assignment from one person to another in one action (drag/dropdown) and see both people's flags update

D) A "what-if" preview before committing an assignment change

E) None of these / requirements already cover what's needed

X) Other (please describe after [Answer]: tag below)

[Answer]:A

## Question 7
For **planned-vs-actual reporting**, how are "actual" hours obtained?

A) SM manually enters actual Dev/QA hours per task (or per person) after the iteration closes

B) Not needed for the first release — reporting on *planned* allocation accuracy is enough

C) Actuals come from an external system later (out of scope now, story is a placeholder)

X) Other (please describe after [Answer]: tag below)

[Answer]:B

## Question 8
Anything about **acceptance-criteria style** you want standardised?

A) Given/When/Then (Gherkin-style) as proposed

B) Plain bullet checklist ("The system shall…")

C) No preference — you choose

X) Other (please describe after [Answer]: tag below)

[Answer]:C

---

## Part C — Execution checklist (runs after you approve this plan)

- [x] C1. Finalise personas from answers → write `aidlc-docs/inception/user-stories/personas.md` (single "Scrum Master" persona per Q3=C)
- [x] C2. Derive story groups from the approved breakdown (Q1=A, 8 feature groups)
- [x] C3. Write stories at the approved granularity (Q2=B medium) in Given/When/Then format (Q8=C, AI choice), INVEST-checked — 21 stories US-1…US-21
- [x] C4. Add acceptance criteria to every story; capacity stories use formula-level criteria + one example (Q4=B)
- [x] C5. Add priority/release tags — MVP / Later flag per story (Q5=B)
- [x] C6. Add extra workflow story from Q6=A → US-15 (allocation reacts immediately to task edits/reassignment). Q7=B → actuals deferred, noted in US-20
- [x] C7. Build the persona → story map
- [x] C8. Write `aidlc-docs/inception/user-stories/stories.md`
- [x] C9. Requirement coverage matrix included; deferred items (FR-27 planned-vs-actual, Team Member view, Jira) noted
- [x] C10. Update `aidlc-state.md`; present completion message
