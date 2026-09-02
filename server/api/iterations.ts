import { Router } from 'express';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';

/**
 * Handles everything scoped to an iteration:
 *   /iterations                              list / create
 *   /iterations/:id                          detail / update / delete
 *   /iterations/:id/capacity                 computed capacity
 *   /iterations/:id/allocation               computed allocation
 *   /iterations/:id/members/:participantId   participant overrides
 *   /iterations/:id/extra-assignments        add
 *   /iterations/:id/extra-assignments/:eaId  update / delete
 *   /iterations/:id/tasks                    list / create
 *   /iterations/:id/export                   xlsx download
 */
export function iterationsRouter({ iterations, allocation, tasks, excel, imports }: Services): Router {
  const r = Router();

  r.get('/', wrap((_req, res) => res.json(iterations.listIterations())));

  r.post('/', wrap((req, res) => res.status(201).json(iterations.createIteration(req.body))));

  r.post('/import-jira', wrap(async (req, res) => {
    res.status(201).json(await imports.importSprint(req.body));
  }));

  r.get('/:id', wrap((req, res) => res.json(iterations.getIteration(param(req, 'id')))));

  r.put('/:id', wrap((req, res) => res.json(iterations.updateIteration(param(req, 'id'), req.body))));

  r.delete('/:id', wrap((req, res) => {
    iterations.deleteIteration(param(req, 'id'));
    res.status(204).end();
  }));

  r.get('/:id/capacity', wrap((req, res) =>
    res.json(iterations.computeCapacity(param(req, 'id'))),
  ));

  r.get('/:id/allocation', wrap((req, res) =>
    res.json(allocation.allocation(param(req, 'id'))),
  ));

  r.put('/:id/members/:participantId', wrap((req, res) => {
    res.json(iterations.setParticipant(param(req, 'id'), param(req, 'participantId'), req.body));
  }));

  r.post('/:id/extra-assignments', wrap((req, res) => {
    res.status(201).json(iterations.addExtraAssignment(param(req, 'id'), req.body));
  }));

  r.put('/:id/extra-assignments/:eaId', wrap((req, res) => {
    res.json(iterations.updateExtraAssignment(param(req, 'id'), param(req, 'eaId'), req.body));
  }));

  r.delete('/:id/extra-assignments/:eaId', wrap((req, res) => {
    iterations.deleteExtraAssignment(param(req, 'id'), param(req, 'eaId'));
    res.status(204).end();
  }));

  r.get('/:id/tasks', wrap((req, res) => res.json(tasks.listTasks(param(req, 'id')))));

  r.post('/:id/tasks', wrap((req, res) => {
    res.status(201).json(tasks.createTask(param(req, 'id'), req.body));
  }));

  r.get('/:id/export', wrap(async (req, res) => {
    const { buffer, fileName } = await excel.exportIteration(param(req, 'id'));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }));

  return r;
}
