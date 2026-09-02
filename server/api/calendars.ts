import { Router } from 'express';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';
import { ValidationError } from '../errors.js';
import type { LocationGroup } from '../../shared/types.js';

/**
 * Calendars. The .ics is sent as a JSON body ({ fileName, ics }) rather than
 * multipart/form-data — multipart is unreliable on serverless (the runtime
 * consumes the request stream before multer can), and `.ics` files are small text.
 */
export function calendarsRouter({ calendars }: Services): Router {
  const r = Router();

  r.get('/', wrap((_req, res) => res.json(calendars.getSummaries())));

  r.post('/:location', wrap((req, res) => {
    const location = param(req, 'location').toUpperCase() as LocationGroup;
    if (location !== 'SL' && location !== 'MY') throw new ValidationError('location must be SL or MY');

    const body = (req.body ?? {}) as { fileName?: unknown; ics?: unknown };
    const ics = typeof body.ics === 'string' ? body.ics : '';
    const fileName = typeof body.fileName === 'string' && body.fileName ? body.fileName : 'calendar.ics';
    if (!ics.trim()) throw new ValidationError('No .ics content received');

    res.json(calendars.uploadCalendar(location, fileName, ics));
  }));

  return r;
}
