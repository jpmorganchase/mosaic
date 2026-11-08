/**
 * Tests for the site's env validation (`lib/config.ts`): every rule, the
 * aggregated `NAME: reason` list, production vs development behaviour, and
 * the typed values call sites read.
 */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkSiteEnv, readSiteConfig, validateSiteConfig, type SiteEnv } from '../config';

/** `.env` + `.env.development`, as `next dev` sees them. */
const readCommittedEnv = (mode: 'development' | 'production'): SiteEnv => ({
  ...parseEnv(readFileSync(new URL('../../../.env', import.meta.url), 'utf8')),
  ...parseEnv(readFileSync(new URL(`../../../.env.${mode}`, import.meta.url), 'utf8')),
  NODE_ENV: mode
});
const DEV_ENV = readCommittedEnv('development');
const PROD_ENV = readCommittedEnv('production');

const TIMEOUT_REASON = 'must be a whole number of milliseconds between 1 and 2147483647';

/** Problems with the production env plus `env`. */
const check = (env: SiteEnv) => checkSiteEnv({ ...PROD_ENV, ...env });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('checkSiteEnv', () => {
  it.each([
    ['the committed development env', DEV_ENV],
    ['the committed production env', PROD_ENV],
    [
      'an active-mode deployment with auth and saves',
      {
        NODE_ENV: 'production',
        MOSAIC_MODE: 'active',
        MOSAIC_ACTIVE_MODE_URL: 'https://mosaic-fs.internal:8080',
        NEXT_PUBLIC_SITE_URL: 'https://docs.example.com',
        MOSAIC_AUTH_ENABLED: 'true',
        AUTH_SECRET: 'a-real-secret',
        GITHUB_ID: 'id',
        GITHUB_SECRET: 'secret',
        MOSAIC_EDITORS: 'Alice@Example.com, @corp.test ,*,',
        MOSAIC_WORKFLOWS_URL: 'wss://mosaic-fs.internal/workflows',
        MOSAIC_WORKFLOWS_SECRET: 'workflows-secret',
        MOSAIC_WORKFLOWS_TIMEOUT_MS: '60000',
        MOSAIC_ACTIVE_MODE_CACHE: 'false'
      }
    ],
    ['empty values, which count as unset', { ...PROD_ENV, MOSAIC_OUTPUT: '', MOSAIC_EDITORS: '' }]
  ])('accepts %s', (_name, env) => {
    expect(checkSiteEnv(env)).toEqual([]);
  });

  it('rejects an unknown MOSAIC_MODE and skips the mode-specific checks', () => {
    expect(check({ MOSAIC_MODE: 'bogus', MOSAIC_SNAPSHOT_DIR: undefined })).toEqual([
      'MOSAIC_MODE: must be one of active, snapshot-file (got "bogus")'
    ]);
  });

  it('rejects an unknown MOSAIC_OUTPUT', () => {
    expect(check({ MOSAIC_OUTPUT: 'static' })).toEqual([
      'MOSAIC_OUTPUT: must be one of export, standalone (got "static")'
    ]);
  });

  it('requires MOSAIC_ACTIVE_MODE_URL in active mode, the default', () => {
    expect(checkSiteEnv({ NODE_ENV: 'production' })).toEqual([
      'MOSAIC_ACTIVE_MODE_URL: is required when MOSAIC_MODE is active (the default)'
    ]);
    expect(check({ MOSAIC_MODE: 'active' })).toEqual([
      'MOSAIC_ACTIVE_MODE_URL: is required when MOSAIC_MODE is active'
    ]);
  });

  it.each(['localhost:8080', 'mosaic-fs', 'ftp://mosaic-fs'])(
    'rejects MOSAIC_ACTIVE_MODE_URL=%s',
    value => {
      expect(check({ MOSAIC_MODE: 'active', MOSAIC_ACTIVE_MODE_URL: value })).toEqual([
        'MOSAIC_ACTIVE_MODE_URL: must be an absolute http(s) URL'
      ]);
    }
  );

  it('requires MOSAIC_SNAPSHOT_DIR in snapshot-file mode', () => {
    expect(check({ MOSAIC_SNAPSHOT_DIR: undefined })).toEqual([
      'MOSAIC_SNAPSHOT_DIR: is required when MOSAIC_MODE is snapshot-file'
    ]);
  });

  it('rejects the removed snapshot-s3 mode', () => {
    expect(check({ MOSAIC_MODE: 'snapshot-s3' })).toEqual([
      'MOSAIC_MODE: must be one of active, snapshot-file (got "snapshot-s3")'
    ]);
  });

  describe.each([
    'MOSAIC_ACTIVE_MODE_CACHE',
    'MOSAIC_DISABLE_LOADER_CACHE',
    'NEXT_PUBLIC_ENABLE_LOGIN',
    'NEXT_PUBLIC_OPTIMIZE_IMAGES',
    'MOSAIC_AUTH_ENABLED',
    'MOSAIC_DEV_FAKE_AUTH',
    'MOSAIC_DEV_BYPASS_CAPABILITY_GATE'
  ])('the boolean flag %s', name => {
    it.each(['true', 'false'])('accepts %s', value => {
      expect(check({ [name]: value })).toEqual([]);
    });

    it.each(['TRUE', 'yes', '1', ' true'])('rejects %j', value => {
      expect(check({ [name]: value })).toEqual([
        `${name}: must be "true" or "false" (got "${value}")`
      ]);
    });
  });

  it.each(['*', '@corp.test', 'alice@corp.test', ' alice@corp.test , @corp.test ,* ,'])(
    'accepts MOSAIC_EDITORS=%j',
    value => {
      expect(check({ MOSAIC_EDITORS: value })).toEqual([]);
    }
  );

  it('lists every invalid MOSAIC_EDITORS entry', () => {
    expect(check({ MOSAIC_EDITORS: 'not-an-email' })).toEqual([
      'MOSAIC_EDITORS: "not-an-email" is not an email address, an @domain or *'
    ]);
    expect(check({ MOSAIC_EDITORS: 'alice@corp.test, *@corp.test, bob@, @' })).toEqual([
      'MOSAIC_EDITORS: "*@corp.test", "bob@", "@" are not an email address, an @domain or *'
    ]);
  });

  it.each([
    'ws://localhost:8080/workflows',
    'wss://mosaic-fs/workflows',
    'http://mosaic-fs/workflows',
    'https://mosaic-fs/workflows'
  ])('accepts MOSAIC_WORKFLOWS_URL=%s', value => {
    expect(check({ MOSAIC_WORKFLOWS_URL: value, MOSAIC_WORKFLOWS_SECRET: 's' })).toEqual([]);
  });

  it.each(['localhost:8080/workflows', 'ftp://mosaic-fs/workflows', 'not a url'])(
    'rejects MOSAIC_WORKFLOWS_URL=%s',
    value => {
      expect(check({ MOSAIC_WORKFLOWS_URL: value, MOSAIC_WORKFLOWS_SECRET: 's' })).toEqual([
        'MOSAIC_WORKFLOWS_URL: must be an absolute ws(s) or http(s) URL'
      ]);
    }
  );

  it('requires MOSAIC_WORKFLOWS_SECRET with MOSAIC_WORKFLOWS_URL', () => {
    expect(check({ MOSAIC_WORKFLOWS_URL: 'ws://localhost:8080/workflows' })).toEqual([
      'MOSAIC_WORKFLOWS_SECRET: is required when MOSAIC_WORKFLOWS_URL is set'
    ]);
    // A secret without a URL is harmless: saves report that the URL is missing.
    expect(check({ MOSAIC_WORKFLOWS_SECRET: 's' })).toEqual([]);
  });

  it.each(['1', '300000', '2147483647'])('accepts MOSAIC_WORKFLOWS_TIMEOUT_MS=%s', value => {
    expect(check({ MOSAIC_WORKFLOWS_TIMEOUT_MS: value })).toEqual([]);
  });

  it.each(['0', '-5', '1.5', '1e3', 'abc', '2147483648'])(
    'rejects MOSAIC_WORKFLOWS_TIMEOUT_MS=%s',
    value => {
      expect(check({ MOSAIC_WORKFLOWS_TIMEOUT_MS: value })).toEqual([
        `MOSAIC_WORKFLOWS_TIMEOUT_MS: ${TIMEOUT_REASON} (got "${value}")`
      ]);
    }
  );

  it.each(['docs.example.com', '/docs', 'ftp://docs.example.com'])(
    'rejects NEXT_PUBLIC_SITE_URL=%s',
    value => {
      expect(check({ NEXT_PUBLIC_SITE_URL: value })).toEqual([
        'NEXT_PUBLIC_SITE_URL: must be an absolute http(s) URL'
      ]);
    }
  );

  it('does not treat the placeholder secrets as errors', () => {
    expect(
      check({
        AUTH_SECRET: 'local-dev-auth-secret-not-for-production',
        MOSAIC_REVALIDATE_SECRET: 'local-dev-not-a-secret'
      })
    ).toEqual([]);
  });

  it('reports every problem at once', () => {
    expect(
      checkSiteEnv({
        NODE_ENV: 'production',
        MOSAIC_MODE: 'active',
        MOSAIC_ACTIVE_MODE_CACHE: 'yes',
        MOSAIC_EDITORS: 'not-an-email',
        MOSAIC_WORKFLOWS_URL: 'ws://localhost:8080/workflows',
        MOSAIC_WORKFLOWS_TIMEOUT_MS: 'soon'
      })
    ).toEqual([
      'MOSAIC_ACTIVE_MODE_CACHE: must be "true" or "false" (got "yes")',
      'MOSAIC_EDITORS: "not-an-email" is not an email address, an @domain or *',
      `MOSAIC_WORKFLOWS_TIMEOUT_MS: ${TIMEOUT_REASON} (got "soon")`,
      'MOSAIC_ACTIVE_MODE_URL: is required when MOSAIC_MODE is active',
      'MOSAIC_WORKFLOWS_SECRET: is required when MOSAIC_WORKFLOWS_URL is set'
    ]);
  });
});

describe('validateSiteConfig', () => {
  const invalid = { MOSAIC_MODE: 'bogus', MOSAIC_EDITORS: 'not-an-email' };

  it('throws one error listing every problem in production', () => {
    expect(() => validateSiteConfig({ ...PROD_ENV, ...invalid })).toThrow(
      [
        '[mosaic-site] Invalid configuration in environment variables:',
        '  - MOSAIC_MODE: must be one of active, snapshot-file (got "bogus")',
        '  - MOSAIC_EDITORS: "not-an-email" is not an email address, an @domain or *'
      ].join('\n')
    );
  });

  it('logs the same list and carries on in development', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const config = validateSiteConfig({ ...DEV_ENV, ...invalid });
    expect(config.mode).toBe('bogus');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message] = errorSpy.mock.calls[0];
    expect(message).toContain('  - MOSAIC_MODE: must be one of');
    expect(message).toContain('  - MOSAIC_EDITORS: "not-an-email"');
    expect(message).toContain('Continuing because NODE_ENV is not production.');
  });

  it('returns the config without logging when it is valid', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(validateSiteConfig(PROD_ENV).mode).toBe('snapshot-file');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reads the process env by default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', '');
    expect(() => validateSiteConfig()).toThrow(
      'MOSAIC_SNAPSHOT_DIR: is required when MOSAIC_MODE is snapshot-file'
    );
  });
});

describe('readSiteConfig', () => {
  it('applies the defaults', () => {
    expect(readSiteConfig({ NODE_ENV: 'production' })).toEqual({
      mode: 'active',
      staticExport: false,
      siteUrl: undefined,
      auth: {
        explicitlyEnabled: false,
        secret: undefined,
        secretIsPlaceholder: false,
        githubId: undefined,
        githubSecret: undefined,
        editors: undefined
      },
      revalidate: { secret: undefined, secretIsPlaceholder: false },
      workflows: { url: '', secret: '', timeoutMs: 300000 },
      dev: { fakeAuth: false, bypassCapabilityGate: false }
    });
  });

  it('maps the committed development env', () => {
    const config = readSiteConfig(DEV_ENV);
    expect(config.mode).toBe('active');
    expect(config.siteUrl).toBe('http://localhost:3000');
    expect(config.auth.secret).toBe('local-dev-auth-secret-not-for-production');
    expect(config.revalidate.secret).toBe('local-dev-not-a-secret');
    expect(config.workflows).toEqual({
      url: 'ws://localhost:8080/workflows',
      secret: 'local-dev-workflows-secret',
      timeoutMs: 300000
    });
    expect(config.dev).toEqual({ fakeAuth: true, bypassCapabilityGate: true });
  });

  it('ignores the placeholder secrets in production only', () => {
    const placeholders = {
      AUTH_SECRET: 'local-dev-auth-secret-not-for-production',
      MOSAIC_REVALIDATE_SECRET: 'local-dev-not-a-secret'
    };
    const production = readSiteConfig({ NODE_ENV: 'production', ...placeholders });
    expect(production.auth).toMatchObject({ secret: undefined, secretIsPlaceholder: true });
    expect(production.revalidate).toEqual({ secret: undefined, secretIsPlaceholder: true });

    const development = readSiteConfig({ NODE_ENV: 'development', ...placeholders });
    expect(development.auth).toMatchObject({
      secret: placeholders.AUTH_SECRET,
      secretIsPlaceholder: false
    });
    expect(development.revalidate).toEqual({
      secret: placeholders.MOSAIC_REVALIDATE_SECRET,
      secretIsPlaceholder: false
    });

    // Each placeholder only applies to its own variable, as before.
    const swapped = readSiteConfig({
      NODE_ENV: 'production',
      AUTH_SECRET: placeholders.MOSAIC_REVALIDATE_SECRET,
      MOSAIC_REVALIDATE_SECRET: placeholders.AUTH_SECRET
    });
    expect(swapped.auth.secretIsPlaceholder).toBe(false);
    expect(swapped.revalidate.secretIsPlaceholder).toBe(false);
  });

  it('falls back to NEXTAUTH_SECRET', () => {
    expect(readSiteConfig({ NEXTAUTH_SECRET: 'legacy' }).auth.secret).toBe('legacy');
    expect(readSiteConfig({ AUTH_SECRET: 'new', NEXTAUTH_SECRET: 'legacy' }).auth.secret).toBe(
      'new'
    );
  });

  it('normalises MOSAIC_EDITORS', () => {
    const editors = (value: string) => readSiteConfig({ MOSAIC_EDITORS: value }).auth.editors;
    expect(editors(' Alice@Example.com, @Corp.test ,,')).toEqual([
      'alice@example.com',
      '@corp.test'
    ]);
    expect(editors('   ')).toBeUndefined();
    // A list with no entries still means "nobody", not "unset".
    expect(editors(',')).toEqual([]);
  });

  it('keeps the previous meaning of values that fail validation', () => {
    const config = readSiteConfig({
      MOSAIC_MODE: 'bogus',
      MOSAIC_OUTPUT: 'export',
      MOSAIC_AUTH_ENABLED: 'TRUE',
      MOSAIC_WORKFLOWS_TIMEOUT_MS: 'soon'
    });
    expect(config.mode).toBe('bogus');
    expect(config.staticExport).toBe(true);
    expect(config.auth.explicitlyEnabled).toBe(false);
    expect(config.workflows.timeoutMs).toBe(300000);
  });
});

describe('getSiteConfig', () => {
  it('reads the process env once', async () => {
    vi.resetModules();
    vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
    const { getSiteConfig } = await import('../config');
    const first = getSiteConfig();
    expect(first.mode).toBe('snapshot-file');
    vi.stubEnv('MOSAIC_MODE', 'active');
    expect(getSiteConfig()).toBe(first);
  });
});
