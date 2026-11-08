import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { MosaicConfig } from '@jpmorganchase/mosaic-types';

const { MosaicCoreMock } = vi.hoisted(() => ({ MosaicCoreMock: vi.fn() }));
vi.mock('@jpmorganchase/mosaic-core', () => ({ default: MosaicCoreMock }));

import { InvalidEnvError } from '../env';
import serve, { server } from '../serve';

const mosaicConfig = {
  pageExtensions: ['.mdx'],
  ignorePages: [],
  serialisers: [],
  plugins: [],
  sources: []
} as unknown as MosaicConfig;

const cliRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliBin = path.join(cliRoot, 'dist', 'index.mjs');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GIVEN the serve command with an invalid env', () => {
  test('THEN it refuses to start before any source boots', async () => {
    vi.stubEnv('MOSAIC_CORS_ORIGINS', 'example.com');
    vi.stubEnv('MOSAIC_REVALIDATE_URL', 'http://localhost:3000/api/revalidate');
    vi.stubEnv('MOSAIC_REVALIDATE_SECRET', '');
    vi.stubEnv('MOSAIC_WORKFLOWS_TIMEOUT_MS', '2147483648');

    const result = serve(mosaicConfig, 0);

    await expect(result).rejects.toBeInstanceOf(InvalidEnvError);
    await expect(result).rejects.toThrow(
      [
        'Invalid configuration in environment variables:',
        '  - MOSAIC_WORKFLOWS_TIMEOUT_MS: must be an integer between 1 and 2147483647 (got "2147483648")',
        '  - MOSAIC_CORS_ORIGINS: "example.com" is not an origin (scheme://host[:port])',
        '  - MOSAIC_REVALIDATE_SECRET: is required when MOSAIC_REVALIDATE_URL is set'
      ].join('\n')
    );
    expect(MosaicCoreMock).not.toHaveBeenCalled();
    expect(server.server.listening).toBe(false);
  });

  test.each(['0', '-1', '1.5', '2147483648', 'Infinity', 'invalid'])(
    'THEN workflow timeout %s prevents startup before any source boots',
    async value => {
      vi.stubEnv('MOSAIC_WORKFLOWS_TIMEOUT_MS', value);

      await expect(serve(mosaicConfig, 0)).rejects.toThrow(
        `MOSAIC_WORKFLOWS_TIMEOUT_MS: must be an integer between 1 and 2147483647 (got "${value}")`
      );
      expect(MosaicCoreMock).not.toHaveBeenCalled();
      expect(server.server.listening).toBe(false);
    }
  );

  // Runs the built bin (CI builds before testing) to check the exit code.
  test.skipIf(!existsSync(cliBin))('THEN `mosaic serve` exits non-zero with every problem', () => {
    const { status, stderr } = spawnSync(
      process.execPath,
      [cliBin, 'serve', '-c', './mosaic.config.mjs', '-p', '0'],
      {
        cwd: cliRoot,
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          MOSAIC_WORKFLOWS_TIMEOUT_MS: '0',
          MOSAIC_CORS_ORIGINS: 'http://localhost:3000/',
          MOSAIC_REVALIDATE_SECRET: '',
          MOSAIC_REVALIDATE_URL: 'http://localhost:3000/api/revalidate'
        }
      }
    );
    expect(status).toBe(1);
    expect(stderr).toContain('[Mosaic][CLI] Invalid configuration in environment variables:');
    expect(stderr).toContain(
      '  - MOSAIC_WORKFLOWS_TIMEOUT_MS: must be an integer between 1 and 2147483647 (got "0")'
    );
    expect(stderr).toContain(
      '  - MOSAIC_CORS_ORIGINS: "http://localhost:3000/" is not an origin (scheme://host[:port]); use "http://localhost:3000"'
    );
    expect(stderr).toContain(
      '  - MOSAIC_REVALIDATE_SECRET: is required when MOSAIC_REVALIDATE_URL is set'
    );
    expect(stderr).not.toContain('at validateServeEnv');
  });
});
