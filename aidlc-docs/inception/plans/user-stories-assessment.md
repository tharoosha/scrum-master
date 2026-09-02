# User Stories Assessment

## Request Analysis
- **Original Request**: Build a Scrum Master tool that allocates sprint time per individual (not just at the aggregate Dev/QA pool level), replacing the Balancer *Iteration Planning* and *Time Allocation* spreadsheets. Location-aware public holidays via `.ics` upload (SL + Malaysia), per-person leave, per-person capacity engine, allocation tracking with over/under flags, history + reporting, Excel export.
- **User Impact**: Direct — the Scrum Master and team leads interact with every feature (roster, iteration setup, task assignment, allocation review, export).
- **Complexity Level**: Medium — small single team and no infrastructure, but a non-trivial capacity-calculation engine, calendar parsing, and several distinct workflows.
- **Stakeholders**: Scrum Master (primary), Team Leads, indirectly the whole Balancer team (their capacity/leave is modelled), and management (consumes the Excel export).

## Assessment Criteria Met
- **High Priority**:
  - *New User Features* — an entirely new user-facing application.
  - *Complex Business Logic* — the §7 capacity specification has multiple rules, roles, and edge cases (SM role, Additional Dev Buffer, location groups, ceremony overrides, weekend/holiday overlap).
  - *Multi-Persona* — Scrum Master vs Team Lead vs (later) team member views.
- **Medium Priority**:
  - *Data Changes affecting reports* — planned-vs-actual reporting and Excel export.
  - *Integration Work* — `.ics` calendar ingestion.
- **Benefits**:
  - Turns the §7 formulas into testable, acceptance-criteria-backed behaviour.
  - Separates the calculation engine, calendar handling, task allocation, and reporting into independently buildable slices (feeds Units Generation).
  - Gives a shared, unambiguous definition of "over-allocated" and "done" for each workflow.

## Decision
**Execute User Stories**: Yes
**Reasoning**: New user-facing product with several distinct workflows and a rules-heavy calculation core. Stories with acceptance criteria are the cheapest way to lock down the engine's expected behaviour and to decompose the build. Overhead is low (single team, one round of planning questions).

## Expected Outcomes
- `personas.md` — Scrum Master, Team Lead, (Team Member as a lightweight future persona).
- `stories.md` — INVEST stories grouped by capability area, each with acceptance criteria, with the capacity-engine stories carrying concrete worked-example criteria drawn from Iteration 204/205.
- A clear story→persona map and a basis for Units Generation.
