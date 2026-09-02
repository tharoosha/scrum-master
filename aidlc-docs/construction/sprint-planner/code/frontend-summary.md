# Code Summary — Frontend (unit: sprint-planner)

React + Vite, `web/`. **Tailwind CSS v4** via `@tailwindcss/vite` — `web/src/styles.css` is
`@import "tailwindcss"` plus an `@layer components` block that styles the shared class names
(`.panel`, `.tabs`, `.badge`, `button.primary/.ghost`, form controls, `.role-qa`, …) with
`@apply`, so components keep short semantic class names. Brand palette in `@theme`.
Served by the Express server from `web/dist` in production; Vite dev server proxies `/api`.

| File | Purpose |
|---|---|
| `web/src/App.tsx` | AppShell + left nav; screen switching via local state; holds the active iteration id |
| `web/src/api/client.ts` | typed `fetch` wrapper (`api.*`), shares `@shared/types` with the server |
| `web/src/ui/kit.tsx` | `StatusBadge`, `RoleTag` + `roleRowClass` (QA rows tinted blue with a left accent, Dev rows plain), `NumberField` (commit-on-blur), `FormRow`, `FileDrop`, `ToastProvider`/`useToast`, `useAsyncAction` (runs an async action, shows errors as a toast), `n2` (2-dp format) |
| `web/src/screens/RosterScreen.tsx` | member table + inline edits, add form with validation, single-SM radio, Settings panel (US-1, US-2, US-3) |
| `web/src/screens/CalendarsScreen.tsx` | SL & MY `.ics` drop zones + parse summary (US-4) |
| `web/src/screens/IterationsScreen.tsx` | iteration list, create form (number auto-fill, Friday-of-week-3 end suggestion, duplicate-number warning), open/delete (US-6, US-19); **Import from Jira** panel — sprint dropdown from `GET /api/jira/sprints`, editable dates (pre-filled from the sprint), Preview (issue count) + Import; hidden when Jira/board isn't configured |
| `web/src/screens/IterationWorkspace.tsx` | **tabbed** workspace with 4 panels + header summary strip + Export link |
| `web/src/screens/ReportScreen.tsx` | cross-iteration table (US-20) |

## Iteration Workspace tabs

| Tab | Stories | Notes |
|---|---|---|
| Leave & Participants | US-7 | per-participant leave (0.5 step), capacity %, add'l buffer, SM radio, included; Extra assignments list + "Add MAUI Review / Common Automation / Custom" |
| Capacity | US-9, US-10, US-18 | full per-person breakdown table + Dev/QA pool footer + manual Dev/QA buffer fields |
| Tasks | US-12, US-13, US-14, US-15 | task table with inline estimate edit, category, Dev/QA assignment selects; unassigned-hours line; add-task row (ID → Title → Capex/Opex → Dev h → QA h). **Jira lookup**: typing an issue key in the ID box and blurring fetches the **title and Capex/Opex** via `GET /api/jira/issue/:key` (Jira "Capex" field: Yes→Capex, else→Opex); on failure the ID stays, title stays blank, a `data-testid="jira-note"` hint shows (non-blocking) |
| Allocation Review | US-16, US-17, US-18 | per-person available/allocated/remaining + `StatusBadge`, sorted Over→Under→OK; pool + unassigned strip |

**US-15 reactivity**: every mutation in any tab calls the workspace's `refresh()`, which
re-fetches `capacity` + `allocation` + `tasks` + `detail` in parallel, so both a changed
person and any re-assignee update immediately.

## Automation-friendly

Interactive elements carry stable `data-testid`s (`nav-*`, `tab-*`, `add-member`,
`add-task`, `assign-dev-<title>`, `status-badge-<status>`, `leave-<name>`, `export-link`, …).

## Tests

- `web/src/ui/kit.test.tsx` — `n2` rounding, `StatusBadge`
- `web/src/screens/RosterScreen.test.tsx` — renders seed member, blocks empty-name add, adds valid member (api mocked)
