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
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

/**
 * Dev-only "fake auth" provider. Enabled by setting
 * `MOSAIC_DEV_FAKE_AUTH=true` in `.env.local`. Lets a developer click
 * Sign In and get a real Auth.js session cookie without configuring a
 * GitHub OAuth app — handy for exercising the `?edit=1` toggle, the
 * server-side `auth()` gate in `page.tsx`, and the preview / persist
 * server actions.
 *
 * Hard-guarded against production: the provider is only registered when
 * NODE_ENV !== 'production' AND the explicit opt-in flag is set.
 */
const FAKE_AUTH_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.MOSAIC_DEV_FAKE_AUTH === 'true';

const providers: NextAuthConfig['providers'] = [
  GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET
  })
];

if (FAKE_AUTH_ENABLED) {
  providers.push(
    Credentials({
      id: 'dev-fake',
      name: 'Dev Fake Login',
      credentials: {
        name: { label: 'Display name', type: 'text', placeholder: 'Dev User' }
      },
      // Auto-accept: any submission produces a session for the given (or
      // default) display name. No password, no DB, no external call.
      authorize: async credentials => {
        const name = (credentials?.name as string) || 'Dev User';
        return {
          id: 'dev-fake-user',
          name,
          email: 'dev@mosaic.local',
          image: 'https://avatars.githubusercontent.com/u/0?v=4'
        };
      }
    })
  );
  // eslint-disable-next-line no-console
  console.warn(
    '[mosaic-site] MOSAIC_DEV_FAKE_AUTH is enabled — anyone can sign in. ' +
      'Do NOT enable this in production.'
  );
}

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
  providers
};

// The `NextAuthResult` annotations are required so TS can emit `.d.ts`
// declarations without an unportable reference into `node_modules/next-auth/lib`.
const result: NextAuthResult = NextAuth(authConfig);

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
