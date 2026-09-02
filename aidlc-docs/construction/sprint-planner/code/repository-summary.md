# Code Summary — Repository / Storage (unit: sprint-planner)

`server/repository/` — persistence. The services read/mutate an in-memory `DbData`; a **Store**
backs it.

| File | Purpose |
|---|---|
| `schema.ts` | `DbData` (in-memory aggregate), `MasterFile` / `IterationFile` (FileStore shapes), `emptyDb()`, `DB_VERSION` |
| `seed.ts` | `buildSeedMembers()` — 11-person roster, **Vihidun = default Scrum Master** |
| `store.ts` | `interface Store { load(): Promise<DbData>; save(db): Promise<void> }`, `withSeed()`, `MemoryStore` (tests) |
| `fileStore.ts` | **local** multi-file store — `planner.json` + `calendars/<loc>.ics` + `iterations/iteration-<n>.json`; synchronous atomic writes, content-diffed, orphan reconciliation |
| `postgresStore.ts` | **hosted** store — Neon Postgres (`@neondatabase/serverless`); the whole `DbData` in one JSONB row (`planner_state`), one SELECT / one UPSERT |
| `index.ts` | `Repository` (wraps a Store): `load()`, `db` getter, `save()` = mark-dirty, `flush()` = write-if-dirty; `getRepository()` picks the store by env; `makeInMemoryRepository()` for tests |

## Request lifecycle (`server/api/index.ts` → `persistence` middleware, `/api/*` only)

1. `await repo.load()` — pull current state from the store
2. route handlers mutate `repo.db` and call `repo.save()` (just flags dirty)
3. `res.end` is wrapped so `await repo.flush()` runs **before** the response bytes are sent

This makes the exact same service code work as a long-running server (FileStore) **and** as a
stateless Vercel function (PostgresStore).

## Store selection

`DATABASE_URL` / `POSTGRES_URL` present → `PostgresStore` (Vercel/Neon).
Otherwise → `FileStore` at `./data/` (local `npm start`).

## Notes

- Postgres store is last-write-wins (one row). Fine for a small team.
- `planner_state` schema is created on first `load()`; also documented in `DEPLOY.md` to
  pre-create it.
- `DB_VERSION = 1`; no migrations yet.
