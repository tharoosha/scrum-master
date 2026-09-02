import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildProductionServices } from './container.js';
import { createApp } from './api/index.js';
import { SERVER_PORT } from '@shared/constants.js';

// Load .env (Jira, DB, auth) before building services. On Vercel the env comes from
// the dashboard, so there's no .env file and this is skipped.
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn('Could not read .env:', err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  const services = await buildProductionServices();
  const app = createApp(services);
  app.listen(SERVER_PORT, () => {
    console.log(`\n  Scrum Master running:  http://localhost:${SERVER_PORT}\n`);
    console.log(
      process.env.DATABASE_URL ?? process.env.POSTGRES_URL
        ? '  Storage: Postgres (Neon)\n'
        : `  Storage: ${process.cwd()}\\data\\  (planner.json + iterations\\iteration-*.json)\n`,
    );
    if (process.env.AUTH_USER && process.env.AUTH_PASS) {
      console.log('  Auth: HTTP Basic (AUTH_USER / AUTH_PASS)\n');
    }
    if (services.jira.isConfigured) {
      void services.jira.status().then((s) => {
        console.log(
          s.authenticated
            ? `  Jira: enabled — authenticated as ${s.accountLabel} (${s.baseUrl})\n`
            : `  Jira: NOT working — ${s.problem} (in .env)\n`,
        );
      });
    }
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
