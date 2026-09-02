# Build Instructions — Balancer Sprint Planner

## Prerequisites
- **Runtime**: Node.js **20 or newer** (verified on Node 24). `npm` ships with Node.
- **Build tools**: none to install separately — Vite (frontend) and `tsx` (runs the TS server) come from `devDependencies`.
- **Environment variables**: none required. Optional, via a `.env` file (copy `.env.example`):
  `PORT` (default `4319`); `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` to enable auto-filling
  task titles from Jira. Loaded by `process.loadEnvFile()` on start (Node 20.12+).
- **System requirements**: any OS (developed on Windows 11). ~300 MB disk for `node_modules`. No database, no Docker, no cloud account.

## Build steps

### 1. Install dependencies
```bash
npm install
```
Expected: `added ~420 packages`. On Windows, `npm warn tar TAR_ENTRY_ERROR` lines for `date-fns` may appear — they are caused by antivirus locking files during extraction and are harmless; re-run `npm install` if a later step reports a missing module.

### 2. Configure environment
Nothing to configure. To change the port:
```bash
# bash
export PORT=5000
# PowerShell
$env:PORT = "5000"
```

### 3. Build
```bash
npm run build          # Vite builds the React app to web/dist/
```
`npm start` runs this automatically, so a separate build is only needed if you want to inspect the bundle.

### 4. Run
```bash
npm start              # builds web/ then starts the server
```
Then open **http://localhost:4319**.

### 5. Verify build success
- **Expected output**: `✓ built in <1s`, then `Balancer Sprint Planner running: http://localhost:4319`.
- **Build artifacts**:
  - `web/dist/` — `index.html` + hashed `assets/index-*.js` (~170 kB) and `assets/index-*.css` (~3 kB). Git-ignored.
  - `data/` — created on first server start: `planner.json` (roster + settings + calendar metadata), `calendars/*.ics` (uploaded holiday files), `iterations/iteration-<n>.json` (one file per iteration). Git-ignored. Copy the folder to back up.
- **Acceptable warnings**: the `npm install` tar warnings above; a Vite note about chunk size is not expected at this size.

## Type checking
```bash
npm run typecheck      # tsc --noEmit, strict mode
```
Expected: no output, exit 0.

## Troubleshooting

### `Cannot find module '@shared/...'`
- **Cause**: path alias not resolved — usually a partial `npm install`.
- **Fix**: delete `node_modules` and `package-lock.json`, run `npm install` again.

### Server starts but the page is blank / 404 for assets
- **Cause**: `web/dist` missing (ran `tsx server/index.ts` directly instead of `npm start`).
- **Fix**: run `npm run build` first, or use `npm start`.

### Port already in use (`EADDRINUSE`)
- **Fix**: set `PORT` to a free port, or stop the process using 4319.

### `npm start` fails on an old Node
- **Cause**: Node < 20 (the app uses `structuredClone`, native `fetch` in tests, ESM).
- **Fix**: install Node 20+ (`node -v` to check).
