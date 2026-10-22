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
    const { mod } = await loadAuth({
      NODE_ENV: 'production',
      AUTH_SECRET: 'a-real-secret-value',
      MOSAIC_EDITORS: '@corp.test'
    });
    const signIn = mod.authConfig?.callbacks?.signIn as unknown as (args: {
      user: { email?: string };
    }) => boolean;
    expect(signIn({ user: { email: 'dev@corp.test' } })).toBe(true);
    expect(signIn({ user: { email: 'dev@elsewhere.test' } })).toBe(false);
  });
});

describe('loadGitHubProfile', () => {
  const provider = { userinfo: { url: new URL('https://api.github.com/user') } };
  const tokens = { access_token: 'gho_token' };

  function stubGitHub(user: Record<string, unknown>, emails: unknown, emailsOk = true) {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/user/emails')
        ? new Response(JSON.stringify(emails), { status: emailsOk ? 200 : 403 })
        : new Response(JSON.stringify(user))
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the public profile email without listing emails', async () => {
    const { mod } = await loadAuth({});
    const fetchMock = stubGitHub({ id: 1, email: 'public@corp.test' }, []);
    const profile = await mod.loadGitHubProfile({ tokens, provider });
    expect(profile.email).toBe('public@corp.test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user', {
      headers: expect.objectContaining({ Authorization: 'Bearer gho_token' })
    });
  });

  it('falls back to the verified primary email', async () => {
    const { mod } = await loadAuth({});
    stubGitHub({ id: 1, email: null }, [
      { email: 'other@corp.test', primary: false, verified: true },
      { email: 'primary@corp.test', primary: true, verified: true }
    ]);
    const profile = await mod.loadGitHubProfile({ tokens, provider });
    expect(profile.email).toBe('primary@corp.test');
  });

  it('skips an unverified primary email', async () => {
    const { mod } = await loadAuth({});
    stubGitHub({ id: 1, email: null }, [
      { email: 'victim@corp.test', primary: true, verified: false },
      { email: 'own@example.com', primary: false, verified: true }
    ]);
    const profile = await mod.loadGitHubProfile({ tokens, provider });
    expect(profile.email).toBe('own@example.com');
  });

  it('leaves the email empty when none is verified or the list fails', async () => {
    const { mod } = await loadAuth({});
    stubGitHub({ id: 1, email: null }, [{ email: 'a@corp.test', primary: true, verified: false }]);
    expect((await mod.loadGitHubProfile({ tokens, provider })).email).toBeNull();
    stubGitHub({ id: 1, email: null }, { message: 'Forbidden' }, false);
    expect((await mod.loadGitHubProfile({ tokens, provider })).email).toBeNull();
  });

  it('is used as the GitHub provider userinfo loader', async () => {
    const { mod } = await loadAuth({
      NODE_ENV: 'production',
      AUTH_SECRET: 'a-real-secret-value',
      MOSAIC_EDITORS: '@corp.test'
    });
    const { default: GitHub } = await import('next-auth/providers/github');
    expect(GitHub).toHaveBeenLastCalledWith(
      expect.objectContaining({ userinfo: { request: mod.loadGitHubProfile } })
    );
  });
});
