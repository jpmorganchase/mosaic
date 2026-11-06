import { describe, expect, test } from 'vitest';

import { checkServeEnv, InvalidEnvError, validateServeEnv, type CliEnv } from '../env';

const ORIGIN_REASON = 'is not an origin (scheme://host[:port])';

describe('GIVEN checkServeEnv', () => {
  test.each<[string, CliEnv]>([
    ['an empty env', {}],
    [
      'a full env',
      {
        MOSAIC_ADMIN_SECRET: 'admin-secret',
        MOSAIC_WORKFLOWS_SECRET: 'workflows-secret',
        MOSAIC_CORS_ORIGINS: 'https://docs.example.com, http://localhost:3000 ,http://[::1]:3000,',
        MOSAIC_REVALIDATE_URL: 'https://docs.example.com/api/revalidate',
        MOSAIC_REVALIDATE_SECRET: 'revalidate-secret',
        MOSAIC_SOURCE_BOOT_TIMEOUT_MS: '60000',
        BITBUCKET_API_URL: 'https://bitbucket.example.com/rest/api/1.0'
      }
    ],
    ['empty values, which count as unset', { MOSAIC_CORS_ORIGINS: '', MOSAIC_REVALIDATE_URL: '' }],
    [
      'the dev placeholder outside development',
      { MOSAIC_WORKFLOWS_SECRET: 'local-dev-workflows-secret' }
    ],
    ['a boot timeout of 0, which waits forever', { MOSAIC_SOURCE_BOOT_TIMEOUT_MS: '0' }]
  ])('THEN %s is valid', (_name, env) => {
    expect(checkServeEnv(env)).toEqual([]);
  });

  test.each(['MOSAIC_ADMIN_SECRET', 'MOSAIC_WORKFLOWS_SECRET'])(
    'THEN a blank %s is rejected',
    name => {
      expect(checkServeEnv({ [name]: '   ' })).toEqual([`${name}: must not be blank`]);
    }
  );

  test('THEN each invalid CORS origin is reported, with a fix when there is one', () => {
    expect(
      checkServeEnv({
        MOSAIC_CORS_ORIGINS:
          'https://ok.example.com, example.com, *, localhost:3000, http://example.com/, https://Example.com, http://example.com:80, https://example.com/docs'
      })
    ).toEqual([
      `MOSAIC_CORS_ORIGINS: "example.com" ${ORIGIN_REASON}`,
      `MOSAIC_CORS_ORIGINS: "*" ${ORIGIN_REASON}`,
      `MOSAIC_CORS_ORIGINS: "localhost:3000" ${ORIGIN_REASON}`,
      `MOSAIC_CORS_ORIGINS: "http://example.com/" ${ORIGIN_REASON}; use "http://example.com"`,
      `MOSAIC_CORS_ORIGINS: "https://Example.com" ${ORIGIN_REASON}; use "https://example.com"`,
      `MOSAIC_CORS_ORIGINS: "http://example.com:80" ${ORIGIN_REASON}; use "http://example.com"`,
      `MOSAIC_CORS_ORIGINS: "https://example.com/docs" ${ORIGIN_REASON}; use "https://example.com"`
    ]);
  });

  test('THEN MOSAIC_REVALIDATE_URL needs MOSAIC_REVALIDATE_SECRET', () => {
    expect(
      checkServeEnv({ MOSAIC_REVALIDATE_URL: 'http://localhost:3000/api/revalidate' })
    ).toEqual(['MOSAIC_REVALIDATE_SECRET: is required when MOSAIC_REVALIDATE_URL is set']);
  });

  test('THEN MOSAIC_REVALIDATE_SECRET alone is accepted, as in an env file shared with the site', () => {
    expect(checkServeEnv({ MOSAIC_REVALIDATE_SECRET: 'secret' })).toEqual([]);
  });

  test.each(['localhost:3000/api/revalidate', '/api/revalidate', 'ws://localhost:3000'])(
    'THEN MOSAIC_REVALIDATE_URL=%s is rejected',
    value => {
      expect(
        checkServeEnv({ MOSAIC_REVALIDATE_URL: value, MOSAIC_REVALIDATE_SECRET: 'secret' })
      ).toEqual(['MOSAIC_REVALIDATE_URL: must be an absolute http(s) URL']);
    }
  );

  test.each(['-1', '1.5', 'soon', '2147483648'])(
    'THEN MOSAIC_SOURCE_BOOT_TIMEOUT_MS=%s is rejected',
    value => {
      expect(checkServeEnv({ MOSAIC_SOURCE_BOOT_TIMEOUT_MS: value })).toEqual([
        `MOSAIC_SOURCE_BOOT_TIMEOUT_MS: must be a whole number of milliseconds up to 2147483647, or 0 to wait forever (got "${value}")`
      ]);
    }
  );

  test('THEN an invalid BITBUCKET_API_URL is rejected', () => {
    expect(checkServeEnv({ BITBUCKET_API_URL: 'bitbucket.example.com' })).toEqual([
      'BITBUCKET_API_URL: must be an absolute http(s) URL'
    ]);
  });
});

describe('GIVEN validateServeEnv', () => {
  test('THEN it returns the values serve uses', () => {
    expect(
      validateServeEnv({
        MOSAIC_CORS_ORIGINS: ' https://docs.example.com ,http://localhost:3000,',
        MOSAIC_REVALIDATE_URL: 'http://localhost:3000/api/revalidate',
        MOSAIC_REVALIDATE_SECRET: 'secret'
      })
    ).toEqual({
      corsOrigins: ['https://docs.example.com', 'http://localhost:3000'],
      revalidate: { url: 'http://localhost:3000/api/revalidate', secret: 'secret' }
    });
    expect(validateServeEnv({})).toEqual({ corsOrigins: [], revalidate: undefined });
  });

  test('THEN it throws one error listing every problem', () => {
    let error: unknown;
    try {
      validateServeEnv({
        MOSAIC_ADMIN_SECRET: ' ',
        MOSAIC_CORS_ORIGINS: 'example.com',
        MOSAIC_REVALIDATE_URL: 'http://localhost:3000/api/revalidate'
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidEnvError);
    const problems = [
      'MOSAIC_ADMIN_SECRET: must not be blank',
      `MOSAIC_CORS_ORIGINS: "example.com" ${ORIGIN_REASON}`,
      'MOSAIC_REVALIDATE_SECRET: is required when MOSAIC_REVALIDATE_URL is set'
    ];
    expect((error as InvalidEnvError).problems).toEqual(problems);
    expect((error as InvalidEnvError).message).toBe(
      [
        'Invalid configuration in environment variables:',
        ...problems.map(problem => `  - ${problem}`)
      ].join('\n')
    );
  });
});
