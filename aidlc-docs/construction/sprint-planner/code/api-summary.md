# Code Summary — HTTP API (unit: sprint-planner)

Express, JSON, mounted under `/api`. Errors → status codes via `errorMiddleware`
(`ValidationError` 400, `NotFoundError` 404, `ConflictError` 409, else 500).
`server/api/index.ts` also serves `web/dist` with SPA fallback when the build exists.

## Endpoints

| Method & path | Service call |
|---|---|
| `GET /api/health` | — |
| `GET /api/members?activeOnly=` | `roster.listMembers` |
| `POST /api/members` | `roster.createMember` |
| `PUT /api/members/:id` | `roster.updateMember` |
| `POST /api/members/:id/deactivate` | `roster.deactivateMember` |
| `POST /api/members/:id/scrum-master` | `roster.setScrumMaster` |
| `GET /api/settings` · `PUT /api/settings` | `settings.getSettings` / `updateSettings` |
| `GET /api/calendars` | `calendars.getSummaries` |
| `POST /api/calendars/:location` (multipart `file`) | `calendars.uploadCalendar` |
| `GET /api/iterations` | `iterations.listIterations` |
| `POST /api/iterations` | `iterations.createIteration` |
| `GET /api/iterations/:id` | `iterations.getIteration` |
| `PUT /api/iterations/:id` | `iterations.updateIteration` (dates, tolerance, dev/qa buffer) |
| `DELETE /api/iterations/:id` | `iterations.deleteIteration` |
| `GET /api/iterations/:id/capacity` | `iterations.computeCapacity` |
| `GET /api/iterations/:id/allocation` | `allocation.allocation` (people + unassigned + pools + capexOpex) |
| `PUT /api/iterations/:id/members/:participantId` | `iterations.setParticipant` |
| `POST /api/iterations/:id/extra-assignments` | `iterations.addExtraAssignment` |
| `PUT/DELETE /api/iterations/:id/extra-assignments/:eaId` | `iterations.updateExtraAssignment` / `deleteExtraAssignment` |
| `GET/POST /api/iterations/:id/tasks` | `tasks.listTasks` / `createTask` |
| `PUT/DELETE /api/tasks/:taskId` | `tasks.updateTask` / `deleteTask` |
| `PUT /api/tasks/:taskId/assign` | `tasks.assignTask` |
| `GET /api/iterations/:id/export` | `excel.exportIteration` → `iteration-<n>.xlsx` download (2 sheets matching the source *Iteration Planning* + *Time Allocation* spreadsheets, with SUM formulas) |
| `GET /api/report` | `reports.allocationReport` |
| `GET /api/jira/status` | `jira.status` — `{ configured, baseUrl, authenticated, accountLabel, boardId, problem }` (probes `/rest/api/3/myself`) |
| `GET /api/jira/issue/:key` | `jira.getIssueSummary` — `{ key, summary, category }` (category from the Jira "Capex" custom field, resolved by name & cached: Yes→Capex, else→Opex, null if no such field); 400 bad key, 404 not found (verified via `/myself`), 501 not configured, 502 `jira_auth_failed` / `jira_bad_base_url` / `jira_unreachable` |
| `GET /api/jira/sprints` | `imports.listSprints` — all sprints on `JIRA_BOARD_ID` (active/future/closed), newest first, dates as `YYYY-MM-DD` or null; 501 `jira_no_board` if unset |
| `GET /api/jira/sprint-preview?name=` | `imports.previewSprint` — `{ sprint, issues[] }` without creating anything |
| `POST /api/iterations/import-jira` | `imports.importSprint` — `{ sprintName, startDate?, endDate? }` → creates the iteration (number from the sprint name) + a Task per issue (title, key, Capex/Opex, original estimate → Dev hours); 409 if that number exists, 400 if the future sprint has no dates and none given |

Integration tests: `server/api/api.test.ts` (supertest) — seed roster, validation→400,
missing→404, full SM→iteration→task→allocation flow, xlsx export.
