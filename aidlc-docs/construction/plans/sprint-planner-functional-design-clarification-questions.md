# Functional Design — Clarification Questions (Round 2)

Your answers changed a few earlier decisions (no "close iteration", no named reserve lines, no
"does not attend ceremonies" override). I need to pin these down before writing the design.

Please fill in each `[Answer]:` tag and tell me when done.

---

## Clarification 1 — Buffer structure (from your Q1 answer)

I read your Q1 answer as this model. **Basis** = "% of gross hours" unless stated.

| Buffer | Applies to | Capex part | Opex part | Total |
|---|---|---|---|---|
| **Discussion** | Dev + QA | 5.0% | 2.5% | 7.5% |
| **Dev Buffer** | Dev only | 3.0% | 1.5% | 4.5% |
| **Buffer** | Dev + QA | 3.0% | 1.5% | 4.5% |
| **Common QA** | QA only | 5.0% | 2.5% | 7.5% |
| **Common Automation** | QA only | **20 hours flat** (toggle per iteration) | 0 | 20h when on |

→ **Dev buffer total = 16.5% of gross hours. QA buffer total = 19.5% of gross hours + 20h (if Common Automation is on).**

### Question 1a
Is that table correct?

A) Yes, exactly

B) Almost — corrections after [Answer]:

X) Other (please describe after [Answer]: tag below)

[Answer]:A

### Question 1b
**Common Automation** (the 20h QA line that is on some sprints, off others):

A) A per-iteration on/off toggle; when on it subtracts a fixed **20h** from the QA pool; default **on**

B) Per-iteration on/off toggle, default **off**

C) Per-iteration **editable number** (default 20h, 0 = effectively off)

X) Other (please describe after [Answer]: tag below)

[Answer]:A (usually its done by one person. so we can reduced from that person not in the QA pool)

### Question 1c
Do you need the Capex vs Opex split **stored/reported separately**, or is only the combined buffer number needed in this tool?

A) Combined number is enough — don't track Capex/Opex separately

B) Track and show the Capex vs Opex split too

X) Other (please describe after [Answer]: tag below)

[Answer]:B

---

## Clarification 2 — Ceremonies (from your Q4 answer)

You said no one is exempt from ceremonies; Daily Scrum is 15 min per working day (so leave
automatically reduces it); Planning / Grooming / Retro / Demo / MAUI Review are not adjustable.

### Question 2a
So every person always gets: **Daily Scrum = 0.25h × (their working days after leave)**, **Planning 1h + Grooming 2h + Retro 0.5h + Demo 1.5h** fixed, and the Scrum Master additionally gets **20h SM Activity**. Correct?

A) Yes

B) No — correction after [Answer]:

[Answer]:A

### Question 2b
**MAUI Review** — the source sheet has a "MAUI Review" line (0h in recent sprints). In this tool:

A) Drop it entirely — no MAUI Review line

B) Keep it as a fixed hours value applied to everyone — value: ___ h (state after [Answer]:)

C) Keep it as a single per-iteration number (applies to everyone, default 0)

X) Other (please describe after [Answer]: tag below)

[Answer]: MAUI review is done by one person like SM Activities and Common Automation capex/opex time. we can add that mannually to that person

---

## Clarification 3 — Reserve / buffer totals (from your Q6 answer)

You said: drop "move to backlog" and "add risk list"; just a total **Dev Buffer** and total **QA Buffer** is enough.

Note there are **two different things** both called "buffer":
- the **% buffers** inside the capacity calc (Clarification 1) — these *reduce each person's available hours*
- a separate **manual Dev Buffer / QA Buffer** in the old Time Allocation sheet (e.g. 68h / 66h) — reserved pool hours for unplanned work

### Question 3a
For this second, manual one:

A) Keep it — each iteration has one **Dev Buffer (hours)** and one **QA Buffer (hours)** field the SM types; they count as "allocated" against the pool (like a task assigned to nobody)

B) Drop it — the % buffers in the capacity calc are the only buffers; no manual pool buffer

C) Other (please describe after [Answer]: tag below)

[Answer]:A

---

## Clarification 4 — History when there is no "close" (from your Q8 answer)

You want to just **create a new iteration with defaults and adjust it** — no close/clone step.
So iterations have no "closed" state. The question is what happens to **past** iterations when
things change later:

### Question 4a
When you **edit the roster** (add/remove a person, change someone's capacity %) or **upload a new holiday calendar**, should **past iterations**:

A) **Stay exactly as they were** — each iteration keeps its own copy of the people + their settings + the holiday dates it used at the time; later changes only affect new iterations *(recommended — keeps your history trustworthy)*

B) **Recalculate** with the new roster/calendar — past iteration numbers can change

C) Other (please describe after [Answer]: tag below)

[Answer]:A

### Question 4b
When you create a new iteration, its starting roster (who's in it, their capacity %, location, etc.) is copied from:

A) The current roster (the master team list) — then you adjust leave etc. for that iteration

B) The previous iteration

C) Other (please describe after [Answer]: tag below)

[Answer]:A

---

## Clarification 5 — Historical validation caveat

The source sheet shows one person with **all ceremonies = 0** in iterations 204/205 (someone
who didn't attend). Under your new "no one is exempt" rule the tool would give that person the
full ceremony deduction, so the reproduced pool totals for 204/205 will be **slightly lower**
than the sheet for those iterations.

### Question 5a
Is that acceptable?

A) Yes — the new rule is correct; the small historical difference is fine

B) No — I still need an exact match; there must be a per-person ceremony override after all

X) Other (please describe after [Answer]: tag below)

[Answer]: no if some person goes to leave for whole sprint then they all ceremonies are 0 for that person. we able to configure that, for a person. 
