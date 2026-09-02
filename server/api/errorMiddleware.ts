import type { NextFunction, Request, Response } from 'express';
import { AppError, ValidationError } from '../errors.js';
import type { ApiError } from '../../shared/types.js';

/** Read a required route param (typed as string, not string | undefined). */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`Missing route parameter: ${name}`);
  }
  return value;
}

/** Wrap an async route handler so thrown errors reach the error middleware. */
export function wrap(
  handler: (req: Request, res: Response) => unknown | Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiError = { error: err.code, message: err.message, details: err.details };
    res.status(err.status).json(body);
    return;
  }
  // multer / body parse errors etc.
  const message = err instanceof Error ? err.message : 'Unexpected error';
  // eslint-disable-next-line no-console
  console.error('[api] unhandled error:', err);
  const body: ApiError = { error: 'internal_error', message };
  res.status(500).json(body);
}
