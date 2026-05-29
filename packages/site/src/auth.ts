/**
 * Auth.js v5 (next-auth@5) configuration.
 *
 * The named exports below are the canonical Auth.js v5 surface:
 * - `handlers` — App Router route handlers (`GET`/`POST`) for
 *   `/api/auth/*`.
 * - `auth`    — universal helper that returns the current `Session`
 *   on the server (in RSCs, route handlers, server actions, and
 *   middleware).
 * - `signIn` / `signOut` — server actions, importable from client
 *   components when needed.
 */
import NextAuth, { type NextAuthConfig, type NextAuthResult } from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const authConfig: NextAuthConfig = {
  // In v5 the default secret env var is `AUTH_SECRET`. Fall back to the
  // legacy `NEXTAUTH_SECRET` so existing deployments keep working
  // through the v4 → v5 migration window.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Auth.js v5 requires `trustHost` to be true for any non-Vercel
  // deployment (self-hosted Docker, Kubernetes, etc.). Mosaic ships
  // both, so opt in unconditionally; the host header is already
  // forwarded correctly by our reverse proxies / Next’s own middleware.
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    })
  ]
};

// The `NextAuthResult` annotations are required so TS can emit `.d.ts`
// declarations without an unportable reference into `node_modules/next-auth/lib`.
const result: NextAuthResult = NextAuth(authConfig);

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
