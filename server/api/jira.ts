import { Router } from 'express';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';

export function jiraRouter({ jira, imports }: Services): Router {
  const r = Router();

  r.get('/status', wrap(async (_req, res) => res.json(await jira.status())));

  r.get('/issue/:key', wrap(async (req, res) => {
    res.json(await jira.getIssueSummary(param(req, 'key')));
  }));

  // sprint import
  r.get('/sprints', wrap(async (_req, res) => res.json(await imports.listSprints())));

  r.get('/sprint-preview', wrap(async (req, res) => {
    const name = String(req.query.name ?? '');
    res.json(await imports.previewSprint(name));
  }));

  return r;
}
