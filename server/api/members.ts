import { Router } from 'express';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';

export function membersRouter({ roster }: Services): Router {
  const r = Router();

  r.get('/', wrap((req, res) => {
    res.json(roster.listMembers({ activeOnly: req.query.activeOnly === 'true' }));
  }));

  r.post('/', wrap((req, res) => {
    res.status(201).json(roster.createMember(req.body));
  }));

  r.put('/:id', wrap((req, res) => {
    res.json(roster.updateMember(param(req, 'id'), req.body));
  }));

  r.post('/:id/deactivate', wrap((req, res) => {
    res.json(roster.deactivateMember(param(req, 'id')));
  }));

  r.post('/:id/scrum-master', wrap((req, res) => {
    res.json(roster.setScrumMaster(param(req, 'id')));
  }));

  return r;
}
