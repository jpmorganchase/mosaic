/**
 * Tests for the deployment-wide auth switch and the editor allowlist in
 * `src/auth.ts`. Both read `process.env` at module load, so each case
 * re-imports the module after stubbing the environment.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const nextAuthMock = vi.fn(() => ({
  handlers: { GET: vi.fn(), POST: vi.fn() },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn()
}));
vi.mock('next-auth', () => ({ default: nextAuthMock }));
vi.mock('next-auth/providers/github', () => ({ default: vi.fn(() => ({ id: 'github' })) }));
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'dev-fake' }))
}));

async function loadAuth(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const mod = await import('../auth');
  return { mod, errorSpy };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  nextAuthMock.mockClear();
});

describe('AUTH_ENABLED', () => {
  it('stays off in production when AUTH_SECRET is the dev placeholder', async () => {
    const { mod, errorSpy } = await loadAuth({
      NODE_ENV: 'production',
      AUTH_SECRET: 'local-dev-auth-secret-not-for-production',
      MOSAIC_AUTH_ENABLED: 'true'
    });
    expect(mod.AUTH_ENABLED).toBe(false);
    expect(nextAuthMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/placeholder/));
  });

  it('is on in production with a real secret', async () => {
    const { mod } = await loadAuth({
      NODE_ENV: 'production',
      AUTH_SECRET: 'a-real-secret-value',
      MOSAIC_AUTH_ENABLED: 'true'
    });
    expect(mod.AUTH_ENABLED).toBe(true);
    expect(nextAuthMock).toHaveBeenCalledTimes(1);
  });

  it('accepts the dev placeholder in development', async () => {
    const { mod } = await loadAuth({
      NODE_ENV: 'development',
      AUTH_SECRET: 'local-dev-auth-secret-not-for-production'
    });
    expect(mod.AUTH_ENABLED).toBe(true);
  });
});

describe('isAuthorizedEditor', () => {
  it('allows everyone in development when MOSAIC_EDITORS is unset', async () => {
    const { mod } = await loadAuth({ NODE_ENV: 'development', MOSAIC_EDITORS: undefined });
    expect(mod.isAuthorizedEditor({ email: 'anyone@example.com' })).toBe(true);
    expect(mod.isAuthorizedEditor(null)).toBe(false);
  });

  it('allows nobody in production when MOSAIC_EDITORS is unset', async () => {
    const { mod } = await loadAuth({ NODE_ENV: 'production', MOSAIC_EDITORS: undefined });
    expect(mod.isAuthorizedEditor({ email: 'anyone@example.com' })).toBe(false);
  });

  it('matches exact emails and @domains case-insensitively', async () => {
    const { mod } = await loadAuth({
      NODE_ENV: 'production',
      MOSAIC_EDITORS: 'Alice@Example.com, @corp.test'
    });
    expect(mod.isAuthorizedEditor({ email: 'alice@example.com' })).toBe(true);
    expect(mod.isAuthorizedEditor({ email: 'bob@corp.test' })).toBe(true);
    expect(mod.isAuthorizedEditor({ email: 'bob@corp.test.evil' })).toBe(false);
    expect(mod.isAuthorizedEditor({ email: 'mallory@example.com' })).toBe(false);
    expect(mod.isAuthorizedEditor({ email: null })).toBe(false);
  });

  it('allows any signed-in user with `*`', async () => {
    const { mod } = await loadAuth({ NODE_ENV: 'production', MOSAIC_EDITORS: '*' });
    expect(mod.isAuthorizedEditor({ email: null })).toBe(true);
  });

  it('wires the allowlist into the Auth.js signIn callback', async () => {
    const signIn = await loadSignIn('@corp.test');
    expect(await signIn({ user: { email: 'dev@corp.test' } })).toBe(true);
    expect(await signIn({ user: { email: 'dev@elsewhere.test' } })).toBe(false);
  });
});

type SignInCallback = (args: {
  user: { email?: string | null };
  account?: { provider: string; access_token?: string };
}) => Promise<boolean>;

async function loadSignIn(editors: string) {
  const { mod } = await loadAuth({
    NODE_ENV: 'production',
    AUTH_SECRET: 'a-real-secret-value',
    MOSAIC_EDITORS: editors
  });
  return mod.authConfig?.callbacks?.signIn as unknown as SignInCallback;
}

function stubGitHubEmails(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('GitHub sign-in', () => {
  const github = { provider: 'github', access_token: 'gho_token' };
  const user = { email: 'dev@corp.test' };

  it('accepts an allowlisted email that GitHub has verified', async () => {
    const signIn = await loadSignIn('@corp.test');
    const fetchMock = stubGitHubEmails(
      Response.json([
        { email: 'other@corp.test', verified: false },
        { email: 'Dev@corp.test', verified: true }
      ])
    );

    expect(await signIn({ user, account: github })).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user/emails',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('gho_token') })
      })
    );
  });

  it('rejects an allowlisted email that GitHub has not verified', async () => {
    const signIn = await loadSignIn('@corp.test');
    stubGitHubEmails(Response.json([{ email: 'dev@corp.test', verified: false }]));

    expect(await signIn({ user, account: github })).toBe(false);
  });

  it('rejects when the emails cannot be checked', async () => {
    const signIn = await loadSignIn('@corp.test');

    stubGitHubEmails(new Response(null, { status: 403 }));
    expect(await signIn({ user, account: github })).toBe(false);

    stubGitHubEmails(new Error('network down'));
    expect(await signIn({ user, account: github })).toBe(false);

    expect(await signIn({ user, account: { provider: 'github' } })).toBe(false);
  });

  it('skips the check when the email does not decide access', async () => {
    const fetchMock = stubGitHubEmails(Response.json([]));

    const anyone = await loadSignIn('*');
    expect(await anyone({ user, account: github })).toBe(true);

    const allowlisted = await loadSignIn('@corp.test');
    expect(await allowlisted({ user, account: { provider: 'dev-fake' } })).toBe(true);
    expect(await allowlisted({ user: { email: 'dev@elsewhere.test' }, account: github })).toBe(
      false
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
