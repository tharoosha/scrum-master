import { Router } from 'express';
import multer from 'multer';
import type { Services } from '../container.js';
import { param, wrap } from './errorMiddleware.js';
import { ValidationError } from '../errors.js';
import type { LocationGroup } from '@shared/types.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export function calendarsRouter({ calendars }: Services): Router {
  const r = Router();

  r.get('/', wrap((_req, res) => res.json(calendars.getSummaries())));

  r.post('/:location', upload.single('file'), wrap((req, res) => {
    const location = param(req, 'location').toUpperCase() as LocationGroup;
    if (location !== 'SL' && location !== 'MY') throw new ValidationError('location must be SL or MY');
    if (!req.file) throw new ValidationError('No .ics file uploaded (field name: "file")');
    const text = req.file.buffer.toString('utf8');
    res.json(calendars.uploadCalendar(location, req.file.originalname, text));
  }));

  return r;
}
