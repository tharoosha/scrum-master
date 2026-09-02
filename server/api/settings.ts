import { Router } from 'express';
import type { Services } from '../container.js';
import { wrap } from './errorMiddleware.js';

export function settingsRouter({ settings }: Services): Router {
  const r = Router();
  r.get('/', wrap((_req, res) => res.json(settings.getSettings())));
  r.put('/', wrap((req, res) => res.json(settings.updateSettings(req.body))));
  return r;
}
