# Unit Test Execution — Balancer Sprint Planner

Test runner: **Vitest 2.x** (config: `vitest.config.ts`). Node environment by default;
`web/**` tests run under jsdom via `environmentMatchGlobs`.

## 1. Run all tests
```bash
npm test               # vitest run  (one-shot, CI mode)
```
Watch mode while developing:
```bash
npx vitest
```

## 2. Expected result
```
Test Files  15 passed (15)
     Tests  83 passed (83)
```

| Suite | File | Tests | What it covers |
|---|---|---|---|
| Working days | `server/calc/workingDays.test.ts` | 6 | weekday counting, holiday subtraction, half-day leave, gross hours (BR-W*) |
| Capacity engine | `server/calc/capacityEngine.test.ts` | 8 | buffer % (16.5 / 19.5, capex/opex split), reproduces sheet rows 18/21/25, ceremony auto-exclusion, pools |
| US-11 validation | `test/us11-iteration-205-validation.test.ts` | 4 | Iteration 205 QA pool exact (160.974), Dev pool within documented row-23 variance |
| Calendar service | `server/services/calendarService.test.ts` | 4 | `.ics` parse (all-day, multi-day expand, skip timed), store/replace, `holidayDatesInRange` |
| Roster service | `server/services/rosterService.test.ts` | 4 | seed roster, single-Scrum-Master invariant, validation, deactivate |
| Jira lookup + sprint import | `server/services/jiraService.test.ts` | 16 | issue lookup (key validation, not-configured, token/email trimming, Basic-auth shape, summary + **`category` from the "Capex" field**, 404 / auth-failed / bad-base-url / network mapping) and **sprint import** (needs `JIRA_BOARD_ID`, sprints newest-first with date-only fields, issues → summary + Capex + estimate hours, unknown sprint → 404 with the available names) |
| Sprint → iteration import | `server/services/importService.test.ts` | 4 | creates Iteration 206 with one task per issue (estimate → Dev hours, `qaEstimateH` 0, Capex from the field), 11 participants; 409 on re-import of an existing number; uses the sprint's Jira dates when present; 400 when the future sprint has no dates and none supplied |
| Excel export format | `server/services/excelExport.test.ts` | 4 | reloads the generated `.xlsx`: two sheets "Iteration &lt;n&gt;" + "Time Allocation"; header block (Iteration No, SL/MY working days, Leave Plan) + row-16 group headers + row-17 column headers match the source; a person row reconciles `C − Z = Remaining` and `AB = Remaining×70%`, `AC = AB×50%` for Arshad; Time Allocation sheet's capacity row, task rows (A:E incl. Capex/Opex), Dev/QA buffer rows, and `SUM` Total |
| Multi-file persistence | `server/repository/persistence.test.ts` | 3 | uploaded `.ics` is written to `data/calendars/<loc>.ics` and survives a restart; each iteration is its own `data/iterations/iteration-<n>.json`, reloads after restart with its tasks; renaming/deleting an iteration renames/removes its file |
| Iteration + Allocation | `server/services/iterationAllocation.test.ts` | 9 | create copies participants + auto SM Activity, auto-increment numbers, **past iterations frozen**, **Malaysia holiday affects only MY-group members**, full-leave ceremony zero, Over/Under/OK flags, task reassignment, manual buffers, role-checked assignment |
| HTTP API | `server/api/api.test.ts` | 8 | seed roster endpoint, validation→400, unknown→404, full SM→iteration→task→allocation flow, `.xlsx` export, `/api/jira/status`, `/api/jira/issue/:key` → 501, `/api/iterations/import-jira` → 501 when Jira unset |
| UI kit | `web/src/ui/kit.test.tsx` | 4 | `n2` rounding, `StatusBadge`, QA-row highlight class (`roleRowClass`), `RoleTag` |
| Roster screen | `web/src/screens/RosterScreen.test.tsx` | 3 | renders seed member, blocks empty-name add, adds a valid member (api mocked) |
| Iterations screen | `web/src/screens/IterationsScreen.test.tsx` | 2 | Import from Jira — selects a sprint from the dropdown, previews the issue count, imports and opens the new iteration |
| Iteration workspace | `web/src/screens/IterationWorkspace.test.tsx` | 3 | editing leave on the **Leave & Participants** tab updates the **Capacity** tab; a Jira key on the **Tasks** tab auto-fills the title **and Capex/Opex**; a failed Jira lookup keeps the ID + shows a note (title blank) |

## 3. Coverage
```bash
npx vitest run --coverage       # requires: npm i -D @vitest/coverage-v8
```
Coverage is concentrated where it matters: the pure calculation layer (`server/calc/`) and the
services are exercised directly; the API layer is covered by `api.test.ts`. No coverage
threshold is enforced.

## 4. If tests fail
1. Read the failing assertion and file:line in the Vitest output.
2. Calc failures → check `server/calc/` against `business-rules.md` (`BR-*` ids are cited in the code).
3. Service failures → check the in-memory repository is seeded (`makeInMemoryRepository()`).
4. `web/` failures → ensure `environmentMatchGlobs` put the file in `jsdom` (filename must be under `web/`).
5. Fix, re-run `npm test` until green, then `npm run typecheck`.
