# Requirements Clarification Questions — Sprint Time Allocation / Scrum Master Software

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options fit, choose the last option (Other) and describe your answer after the `[Answer]:` tag.
Let me know when you are done.

---

## What I already understand (from your two spreadsheets)

- **Iteration Planning Sheet** — for each iteration it works out every person's *available hours*:
  `(sprint working days − personal leave) × 7h`, then subtracts scrum ceremonies
  (Daily Scrum, Planning, Grooming, Retro, Demo, SM Activity, MAUI Review) and Opex/Capex
  buffers (Dev buffer 5%, discussions, etc.), giving a per‑person "90% capacity" and an
  "additional dev buffer". These are then **summed** into one **Dev pool** and one **QA pool**.
- **Time Allocation Sheet** — takes those two pool totals and subtracts the sum of all task
  Dev estimates and all task QA estimates. Example (Iteration 205): Dev pool shows **+39.2h spare**
  while QA pool shows **−47.0h over‑allocated**.
- **The problem**: allocation is done at the **pool level**, not per person. A sprint can look
  balanced in total while individuals are over- or under-allocated.
- **Holidays**: Sri Lanka calendar for most of the team; **Arshad, Meng, Ameerah** use the
  **Malaysia** calendar. Holidays will be uploaded as `.ics` files.

The questions below fill the gaps so I can write the requirements document.

---

## Question 1
What should the software primarily do about the per-person imbalance?

A) **Assist / warn only** — team assigns tasks to people manually; the tool tracks each person's remaining hours and flags who is over- or under-allocated

B) **Assist + suggest** — the tool also recommends which under-allocated person could take an unassigned task (team still confirms)

C) **Auto-allocate** — the tool automatically distributes tasks across people to balance load, team reviews the result

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
How will the software be delivered and used?

A) Web application hosted internally, multiple team members log in

B) Web application, single shared instance, no login (open on the network)

C) Desktop application run locally by the Scrum Master

D) Runs locally as a small web app the Scrum Master opens in a browser

E) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 3
How should task data get into the tool each sprint? (task IDs look like `AB-xxxxx` = Jira)

A) Manual entry / edit in the tool's own UI

B) Import from an uploaded Excel/CSV file (like the current Time Allocation sheet)

C) Direct integration with Jira (pull issues, estimates, assignees via API)

D) Both file import now, Jira integration later

E) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
How should the per-person capacity data (sprint dates, each person's leave, ceremony hours, buffers) get into the tool?

A) Entered and maintained in the tool's own UI, sprint by sprint

B) Imported from an uploaded Excel file matching the current Iteration Planning sheet

C) Mix — team roster and default ceremony/buffer settings kept in the tool; only per-sprint leave entered each sprint

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
Does the tool need to keep history of past iterations (for reporting, trends, actual vs planned)?

A) Yes — keep all iterations, with reporting on allocation accuracy over time

B) Keep history for record only, no special reporting needed

C) No — only the current/next sprint matters

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
Is this for **one team** (the Balancer team) or must it support **multiple teams**?

A) One team only

B) One team now, but designed so more teams can be added later

C) Multiple teams from the start

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
How is each person's **role** handled for allocation — is everyone strictly Dev *or* QA?

A) Each person is exactly one role: Dev or QA

B) Mostly one role, but some people split time between Dev and QA (needs a per-person split)

C) Roles vary per sprint and should be set each sprint

D) Other (please describe after [Answer]: tag below)

[Answer]: Sandun, Charitha and Ishara are QAs, others Dev

## Question 8
How should the **country / holiday calendar** be assigned to each person?

A) A per-person setting in the roster (e.g. Arshad → Malaysia, others → Sri Lanka), changeable anytime

B) A "team/location" grouping (Malaysia team vs SL team) that people belong to

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 9
How often are the holiday `.ics` files uploaded, and should they persist?

A) Uploaded once per year, stored, and reused for every sprint until replaced

B) Uploaded fresh each sprint

C) Stored and reused, with ability to re-upload/replace when the published holiday list changes

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
Should ceremony hours and buffer percentages (Daily Scrum, Planning, Grooming, Retro, Demo, SM Activity, MAUI Review, Dev buffer 5%, Opex/Capex splits) be **configurable**, or fixed as in the current sheet?

A) Configurable defaults applied to everyone, with per-person override when needed

B) Configurable globally only (one set of values for the whole team)

C) Fixed exactly as the current sheet — no need to change them

D) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 11
The current sheet applies "90% capacity" (and 70% for one person) plus an "additional dev buffer" of 50%. How should the tool treat these capacity factors?

A) Keep a configurable capacity % per person (default 90%) and the additional-buffer rule, same as today

B) Simplify to a single configurable capacity % per person, drop the extra buffer layer

C) Keep exactly as-is, not configurable

D) Other (please describe after [Answer]: tag below)

[Answer]: this Additional Dev Buffer only applied to Arshard. but if we want we need to change that person to one or two. and for the arshard and other team members counts 90% capacity

## Question 12
What working day / hours assumptions should the tool use?

A) 5-day work week, 7 productive hours/day, weekends off (as the current sheet implies)

B) 5-day work week, 8 hours/day

C) Configurable hours/day and work-week per team

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 13
Should the tool still produce the **aggregate Dev pool / QA pool** view as well as the per-person view?

A) Yes — show both: per-person allocation *and* the team pool totals

B) Per-person only; team totals are just the sum and not important

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 14
Do you need to **export** results back to Excel (or another format) to share with management or paste into existing sheets?

A) Yes — Excel export of the iteration plan and allocation

B) Yes — but a simple CSV or PDF summary is enough

C) No — viewing in the tool is enough

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 15
Do you have a preferred technology stack, or should I recommend one?

A) Recommend the best fit — no preference

B) Prefer .NET / C# backend (matches the Balancer codebase)

C) Prefer JavaScript/TypeScript (Node + React) full stack

D) Prefer Python

E) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 16
How many people will use the tool, and how sensitive is the data (leave dates, capacity)?

A) A few people (Scrum Master + leads), data is internal-team only, low sensitivity

B) Whole team (~15) can view, only Scrum Master/leads can edit

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Extension Opt-In Questions

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early — it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate — not a finished, production-certified result.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
