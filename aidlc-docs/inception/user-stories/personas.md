# Personas — Sprint Time Allocation / Scrum Master Software

Per planning decision (Q3 = C), the first release has **one persona**. Team Lead and Team
Member contexts are noted for future reference but are not modelled as separate personas yet.

---

## Primary Persona — The Scrum Master

| Attribute | Detail |
|---|---|
| **Name / label** | Scrum Master (SM) |
| **Role** | Runs iteration planning for the single Balancer team. Exactly one person holds the SM designation in the tool at a time; it can be reassigned. |
| **Goals** | Plan each iteration so that **every individual** is realistically loaded — no silent over- or under-allocation; produce a defensible plan quickly; keep a record across iterations; share results with management. |
| **Pain points today** | Two linked Excel sheets only balance at the aggregate Dev/QA pool level. Individuals end up over- or under-allocated. Holidays are applied as an aggregate, not per person/location. Re-deriving the math each sprint is slow and error-prone. |
| **Context of use** | Opens the tool locally in a browser (`localhost`) on a Windows machine. Uses it heavily during sprint planning, lightly mid-sprint for rebalancing. |
| **Technical comfort** | Comfortable with spreadsheets and web apps; not a developer. Needs every calculated number to be visible and traceable — no hidden math. |
| **Key data they own** | Team roster & per-person config, SL and Malaysia holiday `.ics` files, per-iteration leave, tasks and their Dev/QA estimates, task assignments. |
| **Definition of success** | "In a few minutes I can see each person's available vs allocated hours, who is over and who is under, move a couple of task assignments, and export the plan." |

### Secondary contexts (not separate personas in release 1)
- **Team Lead** — in practice may sit with the SM to adjust assignments. Uses the same screens; no separate permissions in release 1.
- **Team Member** — may want a read-only view of their own allocation. Explicitly **out of scope** for release 1 (candidate for a later release).

---

## Team reference data (modelled by the tool, not users of it)

| Person | Role | Location group | Capacity % | Additional Dev Buffer |
|---|---|---|---|---|
| Arshad | Dev | Malaysia | 70 | Yes |
| Meng | Dev | Malaysia | 90 | No |
| Ameerah | Dev | Malaysia | 90 | No |
| Prasanna | Dev | Sri Lanka | 90 | No |
| Tharindu | Dev | Sri Lanka | 90 | No |
| Vihidun | Dev | Sri Lanka | 90 | No |
| Thilina | Dev | Sri Lanka | 90 | No |
| Chamath | Dev | Sri Lanka | 90 | No |
| Ishara | QA | Sri Lanka | 90 | No |
| Sandun | QA | Sri Lanka | 90 | No |
| Charitha | QA | Sri Lanka | 90 | No |

*(Seed data from the supplied sheets; the SM can edit it. Malaysia team = Arshad, Meng, Ameerah.)*
