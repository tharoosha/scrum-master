import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { buildProductionServices } from '../server/container.js';
import { createApp } from '../server/api/index.js';

/**
 * Vercel serverless entry. The Express app is built once per warm instance;
 * the persistence middleware inside createApp() loads/flushes Neon Postgres per request.
 * A failed cold start is retried on the next request (the promise isn't cached on error).
 */
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = buildProductionServices()
      .then(createApp)
      .catch((err: unknown) => {
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getApp();
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
