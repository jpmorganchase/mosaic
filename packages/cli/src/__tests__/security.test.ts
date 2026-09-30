import { afterEach, describe, expect, test, vi } from 'vitest';

import { extractSecret, isSafeRoute, readSecret, secretsMatch } from '../plugins/security';

describe('GIVEN isSafeRoute', () => {
  test.each(['/mosaic/index', '/mosaic/configure/sources/git-repo-source.mdx', '/a'])(
    'THEN %s is accepted',
    route => {
      expect(isSafeRoute(route)).toBe(true);
    }
  );

  test.each([
    '',
    '/',
    'mosaic/index',
    '/mosaic/../../etc/passwd',
    '/mosaic/./index',
    '/mosaic//index',
    '/mosaic/index/',
    '/mosaic\\..\\x',
    '/mosaic/\u0000index',
    `/${'a'.repeat(2000)}`,
    42,
    undefined
  ])('THEN %j is rejected', route => {
    expect(isSafeRoute(route)).toBe(false);
  });
});

describe('GIVEN secretsMatch', () => {
  test('THEN only identical secrets match', () => {
    expect(secretsMatch('s3cret', 's3cret')).toBe(true);
    expect(secretsMatch('s3cres', 's3cret')).toBe(false);
    expect(secretsMatch('short', 's3cret')).toBe(false);
  });
});

describe('GIVEN readSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('THEN a real secret is returned in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'real-secret');
    expect(readSecret('MOSAIC_WORKFLOWS_SECRET')).toBe('real-secret');
  });

  test('THEN the dev placeholder is ignored in production only', () => {
    vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'local-dev-workflows-secret');
    vi.stubEnv('NODE_ENV', 'production');
    expect(readSecret('MOSAIC_WORKFLOWS_SECRET')).toBeUndefined();
    vi.stubEnv('NODE_ENV', 'development');
    expect(readSecret('MOSAIC_WORKFLOWS_SECRET')).toBe('local-dev-workflows-secret');
  });

  test('THEN an unset or empty secret is undefined', () => {
    vi.stubEnv('MOSAIC_ADMIN_SECRET', '');
    expect(readSecret('MOSAIC_ADMIN_SECRET')).toBeUndefined();
  });
});

describe('GIVEN extractSecret', () => {
  test('THEN the dedicated header wins over Authorization', () => {
    expect(
      extractSecret(
        { 'x-mosaic-admin-secret': 'custom', authorization: 'Bearer bearer' },
        'x-mosaic-admin-secret'
      )
    ).toBe('custom');
  });

  test('THEN a Bearer token is used as a fallback', () => {
    expect(extractSecret({ authorization: 'Bearer bearer' }, 'x-mosaic-admin-secret')).toBe(
      'bearer'
    );
  });

  test('THEN null is returned when nothing is sent', () => {
    expect(extractSecret({ authorization: 'Basic abc' }, 'x-mosaic-admin-secret')).toBeNull();
  });

  test('THEN the password of a Basic Authorization header is used', () => {
    const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
    expect(extractSecret({ authorization: basic('admin:s3:cret') }, 'x-mosaic-admin-secret')).toBe(
      's3:cret'
    );
    expect(extractSecret({ authorization: basic(':s3cret') }, 'x-mosaic-admin-secret')).toBe(
      's3cret'
    );
    expect(extractSecret({ authorization: basic('admin:') }, 'x-mosaic-admin-secret')).toBeNull();
    expect(extractSecret({ authorization: basic('no-colon') }, 'x-mosaic-admin-secret')).toBeNull();
  });
});
