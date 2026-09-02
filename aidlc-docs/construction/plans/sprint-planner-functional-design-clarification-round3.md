# Functional Design — Clarification Questions (Round 3, final)

Almost there. Your Round 2 answers introduced three "done by one person" lines
(SM Activity, MAUI Review, Common Automation) and a per-person ceremony toggle. Just need to
model these precisely, then I'll write the design.

Please fill in each `[Answer]:` tag and tell me when done.

---

## Clarification A — "Special assignment" lines (SM Activity, MAUI Review, Common Automation)

These three all work the same way: **extra hours charged to one specific person** for an
iteration, on top of the normal ceremonies/buffers.

| Line | Who | Default hours | Capex/Opex | On/off |
|---|---|---|---|---|
| **SM Activity** | the Scrum Master (auto) | 20h | ? | always on |
| **MAUI Review** | a person the SM picks | ? | ? | optional per iteration |
| **Common Automation** | a QA person the SM picks | 20h | Capex | optional per iteration (default on?) |

### Question A1
Model all three as one concept — a per-iteration list of **"extra assignments"**: `{ person, label, hours, expenseType (Capex/Opex/none) }`. SM Activity is auto-added for the Scrum Master; the SM adds/removes MAUI Review and Common Automation as needed. Agree?

A) Yes — one unified "extra assignments" list

B) No — keep them as three separate fixed fields (describe after [Answer]:)

X) Other (please describe after [Answer]: tag below)

[Answer]: A but for Common Automation we have 20 capex and 10 opex hours. Maui review default is configurable and it is opex, sm activites default value is fixed and it is opex

### Question A2
Fill in the missing cells in the table above:
- **SM Activity** expense type: `Capex` / `Opex` / `none` → Opex
- **MAUI Review** default hours: ___ and expense type: `Capex` / `Opex` / `none` → Opex
- **Common Automation** default on or off for a new iteration → off

[Answer]: Opex, Opex and off

### Question A3
Do these extra-assignment hours reduce **that person's available hours** (like SM Activity does in the current sheet — column J is inside the person's deduction), i.e. they show up in that person's capacity breakdown?

A) Yes — subtract from that person's available hours, shown in their breakdown

B) No — they reduce the pool total only, not tied into the person's row

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Clarification B — Per-person ceremony exclusion (from your Q5a answer)

You said: if a person is on leave for the whole sprint, all their ceremonies should be 0, and
the SM should be able to configure that per person.

### Question B1
How should this work?

A) A per-person, per-iteration checkbox **"Exclude ceremonies"** the SM ticks; when ticked, that person's Daily Scrum + Planning + Grooming + Retro + Demo all = 0 (SM Activity / extra assignments still apply if any)

B) **Automatic** — whenever a person's leave covers the entire sprint (leave days ≥ working days), ceremonies auto-zero; no checkbox

C) **Both** — auto-zero when leave ≥ working days, and a manual checkbox for other cases

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Clarification C — Capex / Opex reporting (from your Q1c = B)

You want the Capex vs Opex split tracked. To confirm what the tool should show:

### Question C1
A per-iteration **Capex/Opex summary**: total hours (and %) that are Capex vs Opex, adding up:
the buffer lines' Capex/Opex portions across all people + the extra-assignment lines' expense
types + optionally each task's category (Capex/Opex from Q17 of the task). Is that the right scope?

A) Yes — sum buffers + extra assignments + task categories into a Capex vs Opex total for the iteration

B) Buffers + extra assignments only (ignore task category for this summary)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question C2
Is the Capex/Opex summary needed in the **Excel export** too?

A) Yes — include it in the export

B) No — on-screen only

X) Other (please describe after [Answer]: tag below)

[Answer]: N
