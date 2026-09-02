import type { NextFunction, Request, Response } from 'express';

/**
 * Optional HTTP Basic auth for the API. Enabled only when `AUTH_USER` and `AUTH_PASS`
 * are both set — otherwise every request passes (local dev).
 *
 * On Vercel the static frontend is also protected by the Edge middleware in
 * `middleware.ts`; this guards the `/api` routes.
 */
export function basicAuth() {
  const user = process.env.AUTH_USER ?? '';
  const pass = process.env.AUTH_PASS ?? '';

  return (req: Request, res: Response, next: NextFunction) => {
    if (!user || !pass) return next();
    if (req.path === '/api/health') return next();

    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [u, p] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
      if (u === user && p === pass) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Scrum Master"');
    res.status(401).send('Authentication required');
  };
}
