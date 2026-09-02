import { Router } from 'express';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';

/** Task operations by task id: /tasks/:taskId, /tasks/:taskId/assign */
export function tasksRouter({ tasks }: Services): Router {
  const r = Router();

  r.put('/:taskId', wrap((req, res) => res.json(tasks.updateTask(param(req, 'taskId'), req.body))));

  r.delete('/:taskId', wrap((req, res) => {
    tasks.deleteTask(param(req, 'taskId'));
    res.status(204).end();
  }));

  r.put('/:taskId/assign', wrap((req, res) =>
    res.json(tasks.assignTask(param(req, 'taskId'), req.body)),
  ));

  return r;
}
