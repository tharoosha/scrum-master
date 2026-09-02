import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { buildProductionServices } from '../server/container.js';
import { createApp } from '../server/api/index.js';

/**
 * Vercel serverless entry. The Express app is built once per warm instance;
 * the persistence middleware inside createApp() loads/flushes Neon Postgres per request.
 */
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = buildProductionServices()
      .then(createApp)
      .catch((err: unknown) => {
        appPromise = null; // retry on the next request
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp();
    (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server initialisation failed';
    // eslint-disable-next-line no-console
    console.error('[api] init failed:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'init_failed', message }));
  }
}
