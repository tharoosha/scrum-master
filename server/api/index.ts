import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Services } from '../container.js';
import { errorMiddleware } from './errorMiddleware.js';
import { basicAuth } from './basicAuth.js';
import { membersRouter } from './members.js';
import { settingsRouter } from './settings.js';
import { calendarsRouter } from './calendars.js';
import { iterationsRouter } from './iterations.js';
import { tasksRouter } from './tasks.js';
import { reportRouter } from './report.js';
import { jiraRouter } from './jira.js';

/**
 * Load the current state before each request and flush any changes before the
 * response is sent — so the same code works both as a long-running server (FileStore)
 * and as a stateless serverless function (PostgresStore).
 */
function persistence(services: Services) {
  return (_req: Request, res: Response, next: NextFunction) => {
    services.repo
      .load()
      .then(() => {
        const realEnd = res.end.bind(res);
        let started = false;
        // res.json / res.send all funnel through res.end — flush there.
        (res.end as unknown) = (...args: unknown[]) => {
          if (started) return res;
          started = true;
          services.repo
            .flush()
            .catch((err) => console.error('[persistence] flush failed:', err))
            .finally(() => (realEnd as (...a: unknown[]) => unknown)(...args));
          return res;
        };
        next();
      })
      .catch(next);
  };
}

export function createApp(services: Services): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(basicAuth());
  app.use(express.json({ limit: '5mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use(persistence(services));
  api.use('/members', membersRouter(services));
  api.use('/settings', settingsRouter(services));
  api.use('/calendars', calendarsRouter(services));
  api.use('/iterations', iterationsRouter(services));
  api.use('/tasks', tasksRouter(services));
  api.use('/report', reportRouter(services));
  api.use('/jira', jiraRouter(services));
  app.use('/api', api);

  // Serve the built SPA when running as a single server (local `npm start`).
  // On Vercel the static files are served by the platform, not this function.
  const webDist = join(process.cwd(), 'web', 'dist');
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  app.use(errorMiddleware);
  return app;
}
