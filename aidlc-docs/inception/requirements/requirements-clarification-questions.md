# Requirements Clarification Questions (Round 2)

Your answers were clear on most points. A few things about the **capacity calculation** still need pinning down before I write the requirements, because they drive the core "per-person available hours" math.

Please fill in the letter after each `[Answer]:` tag and tell me when done.

---

## Ambiguity 1: Capacity % for Arshad (70% vs 90%)

In the **current** Iteration Planning sheet, Arshad's row uses **70%** capacity (`Remaining × 70%`) while everyone else uses **90%**. Your answer to Q11 says *"for the arshard and other team members counts 90% capacity"*, but your answer to Q10 was *"fixed exactly as the current sheet"*.

### Clarification Question 1
What capacity % should the tool apply?

A) **90% for everyone**, including Arshad (the 70% in the old sheet was a one-off; standardise to 90%)

B) Keep it **per-person and configurable** — default 90%, but the Scrum Master can set a different % for any person (e.g. someone ramping up)

C) Keep **exactly as the current sheet**: 70% for Arshad, 90% for everyone else, not changeable

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Ambiguity 2: What the "Additional Dev Buffer" is

In the current sheet there is an extra line **"Additional Dev Buffer"** = `(that person's 90%/70% capacity) × 50%`, and it is applied **only to Arshad**. You said you want to be able to apply it to **one or two people** instead of just Arshad.

### Clarification Question 2
How should the "Additional Dev Buffer" work?

A) It **reduces** the selected person's available hours by 50% of their post-ceremony capacity (they are only ~half-allocated to sprint work — e.g. they also do lead / support / ops duties). Scrum Master picks which 1–2 people it applies to each sprint.

B) It is an **extra reserve line shown separately** (not subtracted from the person) — informational only

C) Same as A, but the buffer **percentage is also configurable** (default 50%), not just who it applies to

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Ambiguity 3: Ceremony hours — same for everyone, or editable per person?

The current sheet has **different ceremony values per person** — most Devs/QAs have the same set (Daily Scrum, Planning 1h, Grooming 2h, Retro 0.5h, Demo 1.5h), but one person has extra **"SM Activity"** hours and another has **all ceremonies at 0**.

### Clarification Question 3
How should ceremony hours be handled?

A) **Standard default set** applied to every person automatically, **plus** per-person overrides each sprint (mark someone as Scrum Master to add SM Activity hours; set to 0 for anyone not attending)

B) Standard default set for everyone, **no** overrides — every person always gets the same ceremony deduction

C) Fully entered per person, every sprint, with no defaults

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

## Bonus: "SM Activity" and "MAUI Review" hours

### Clarification Question 4
The "SM Activity" (~20h) and "MAUI Review" lines — are these:

A) **SM Activity** = time the Scrum Master spends running the team (applies only to whoever is SM); **MAUI Review** = a review duty that rotates / applies to specific people — both should be per-person, editable each sprint

B) Both are fixed team-wide values, no per-person handling needed

C) Other (please describe after [Answer]: tag below)

[Answer]:
