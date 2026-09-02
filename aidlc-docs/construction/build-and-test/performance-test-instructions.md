# Performance Test Instructions — Balancer Sprint Planner

## Applicability

**Formal load/stress testing is not required for this release** and is out of scope per the
approved NFRs (`requirements.md` §8, NFR-8) and the execution plan (Infrastructure Design and
NFR Requirements were both SKIPPED). The tool is a **local, single-user** app for one team.

Realistic upper bounds:
- ~15 team members
- ~20–30 iterations of history
- ~60–100 tasks per iteration
- 1 concurrent user (the Scrum Master), occasionally 2

At this scale every operation is an in-memory array pass plus one JSON file write.

## Lightweight performance checks (sufficient for this release)

### 1. Full-recompute latency
`GET /api/iterations/:id/allocation` recomputes capacity + allocation + Capex/Opex from scratch
on every call (no caching — this is what keeps US-15 correct).

**Check**: with a seeded iteration of 11 participants and 100 tasks, the endpoint should return
in **well under 50 ms** locally.

> Measured during Build & Test: `allocation()` (full capacity + allocation + Capex/Opex
> recompute) = **~0.64 ms/call** over 11 participants + 100 assigned tasks. HTTP round-trip on
> `localhost` adds a few ms.
```bash
# with the server running:
time curl -s "http://localhost:4319/api/iterations/<id>/allocation" > /dev/null
```

### 2. Data file growth
`data/planner.json` for a full year (~17 iterations × ~80 tasks) is on the order of **1–3 MB**.
Each save rewrites the whole file (atomic temp + rename). Acceptable at this size; if the file
ever exceeds ~20 MB, revisit (see `business-rules.md` BR-H2).

### 3. Frontend bundle
`web/dist/assets/index-*.js` ≈ **170 kB (52 kB gzipped)**. Loads instantly from `localhost`.

## If scale assumptions change

Should the tool later serve many teams or many concurrent users, revisit:
- swap the whole-file JSON store for SQLite (indexed reads/writes)
- cache computed capacity per iteration, invalidated on participant/holiday/extra-assignment change
- add the Infrastructure Design stage that was skipped

These are explicitly deferred and not part of the current acceptance criteria.
