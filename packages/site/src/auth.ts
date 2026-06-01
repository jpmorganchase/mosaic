/**
 * Auth.js v5 (next-auth@5) configuration.
 *
 * Two-stage opt-in:
 *
 *   1. **Deployment-wide switch** — `AUTH_ENABLED` (below) gates whether
 *      Auth.js initialises at all. When `false`, `auth()` is a no-op that
 *      returns `null`, `handlers.GET/POST` return 404, and the editor
 *      bundle is unreachable. No `AUTH_SECRET`, no `next-auth` runtime
 *      cost. This is the right shape for read-only docs deployments
 *      (public mirrors, preview environments, etc.).
 *
 *   2. **Per-page capability gate** — `sharedConfig.sourceCapabilities.writable`,
 *      enforced in `app/[...route]/page.tsx`. Even with auth on, pages
 *      from non-writable sources stay read-only.
 *
 * The named exports below are the canonical Auth.js v5 surface, served
 * from real Auth.js when enabled and from no-op stubs otherwise:
 * - `handlers` — App Router route handlers (`GET`/`POST`) for
 *   `/api/auth/*`. Stubs return 404 — `<SessionProvider>` will read
 *   that as "no session" and settle to `null`.
 * - `auth`    — universal helper that returns the current `Session`
 *   on the server (in RSCs, route handlers, server actions, and
 *   middleware). Stub returns `null` so callers can `await auth()`
 *   unconditionally without null-checking the function.
 * - `signIn` / `signOut` — server actions, importable from client
 *   components when needed. Stubs throw with a clear message so any
 *   accidental client-side sign-in call surfaces loudly rather than
 *   silently no-op'ing.
 *
 * Activation:
 *   `MOSAIC_AUTH_ENABLED=true` — the explicit primary signal.
 *   Presence of `AUTH_SECRET` / `NEXTAUTH_SECRET` — secondary fallback,
 *   so an operator who set the secret but forgot the flag still gets
 *   auth (and a clear warning, not a confusing silent disable).
 */
import NextAuth, { type NextAuthConfig, type NextAuthResult } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

/**
 * Deployment-wide auth switch. Build-time constant — when this is
 * `false`, the `if (AUTH_ENABLED)` block below dead-codes and the
 * stub exports below are what consumers receive. Static analysis
 * lets bundlers tree-shake the `next-auth/react` client subgraph
 * out of `<SessionProvider>` callers too (see `app/providers.tsx`).
 */
export const AUTH_ENABLED =
  process.env.MOSAIC_AUTH_ENABLED === 'true' ||
  Boolean(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);

if (
  AUTH_ENABLED &&
  process.env.MOSAIC_AUTH_ENABLED !== 'true' &&
  process.env.NODE_ENV === 'production'
) {
  // Implicit-enable path: secret is set but the explicit flag isn't.
  // Honour it (deploys that had `AUTH_SECRET` predate the flag) but
  // warn so the operator can make it explicit going forward.
  // eslint-disable-next-line no-console
  console.warn(
    '[mosaic-site] Auth is enabled because AUTH_SECRET is set; ' +
      'set MOSAIC_AUTH_ENABLED=true to make this explicit.'
  );
}

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
 * Also requires `AUTH_ENABLED` — without that there's no Auth.js
 * runtime for the credentials to flow through.
 */
const FAKE_AUTH_ENABLED =
  AUTH_ENABLED &&
  process.env.NODE_ENV !== 'production' &&
  process.env.MOSAIC_DEV_FAKE_AUTH === 'true';

// ---------------------------------------------------------------------------
// No-auth stub exports (used when AUTH_ENABLED === false)
// ---------------------------------------------------------------------------

type Handlers = NextAuthResult['handlers'];
type AuthFn = NextAuthResult['auth'];
type SignInFn = NextAuthResult['signIn'];
type SignOutFn = NextAuthResult['signOut'];

// 404 handlers. `<SessionProvider>` polls `/api/auth/session` on mount;
// a 404 (with no body) makes it settle into the `unauthenticated` state
// without throwing.
const noAuthHandlers: Handlers = {
  GET: () => new Response(null, { status: 404 }),
  POST: () => new Response(null, { status: 404 })
} as unknown as Handlers;

// Synchronous no-op session resolver. Returning `null` matches the
// "no session" outcome the rest of the codebase already handles.
const noAuthAuth: AuthFn = (async () => null) as unknown as AuthFn;

// Loud throws on sign-in/out attempts. If something tried to call
// these, the deployment was probably mis-configured (editor UI
// showing despite no auth) and we want the error visible.
const noAuthSignIn: SignInFn = (async () => {
  throw new Error(
    '[mosaic-site] signIn() called but MOSAIC_AUTH_ENABLED is not set. ' +
      'Set MOSAIC_AUTH_ENABLED=true (and AUTH_SECRET) to enable Auth.js.'
  );
}) as unknown as SignInFn;

const noAuthSignOut: SignOutFn = (async () => {
  throw new Error(
    '[mosaic-site] signOut() called but MOSAIC_AUTH_ENABLED is not set.'
  );
}) as unknown as SignOutFn;

// ---------------------------------------------------------------------------
// Real Auth.js wiring (only when AUTH_ENABLED)
// ---------------------------------------------------------------------------

let handlers: Handlers = noAuthHandlers;
let auth: AuthFn = noAuthAuth;
let signIn: SignInFn = noAuthSignIn;
let signOut: SignOutFn = noAuthSignOut;
let authConfig: NextAuthConfig | undefined;

if (AUTH_ENABLED) {
  const providers: NextAuthConfig['providers'] = [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    })
  ];

  // In production a missing GitHub OAuth env pair is silently
  // registered and only fails at click time with a confusing 500
  // from Auth.js. Warn at boot so the deployer notices in startup
  // logs instead of in the first sign-in attempt. Dev runs
  // typically rely on MOSAIC_DEV_FAKE_AUTH so a missing GitHub
  // config is expected.
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.GITHUB_ID || !process.env.GITHUB_SECRET)
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '[mosaic-site] GitHub provider is registered but GITHUB_ID and/or ' +
        'GITHUB_SECRET is unset. Sign-in will fail with an opaque OAuth error.'
    );
  }

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

  authConfig = {
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
  handlers = result.handlers;
  auth = result.auth;
  signIn = result.signIn;
  signOut = result.signOut;
}

export { authConfig, handlers, auth, signIn, signOut };
