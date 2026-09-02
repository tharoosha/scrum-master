/**
 * Vercel Edge Middleware — HTTP Basic auth for the whole site (static files + API).
 * Runs before anything is served. Enabled only when AUTH_USER + AUTH_PASS are set
 * in the Vercel project's Environment Variables.
 *
 * (This file is Vercel-only; it has no effect on local `npm start`, where the
 * Express basicAuth middleware does the same job.)
 */
export const config = {
  matcher: ['/((?!_vercel|favicon\\.ico).*)'],
};

export default function middleware(request: Request): Response | undefined {
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASS;
  if (!user || !pass) return undefined;

  const header = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    try {
      const [u, p] = atob(encoded).split(':');
      if (u === user && p === pass) return undefined;
    } catch {
      /* fall through to 401 */
    }
  }
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Scrum Master"' },
  });
}
