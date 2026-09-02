import { Router } from 'express';
import type { Services } from '../container.js';
import { wrap } from './errorMiddleware.js';

export function reportRouter({ reports }: Services): Router {
  const r = Router();
  r.get('/', wrap((_req, res) => res.json(reports.allocationReport())));
  return r;
}
