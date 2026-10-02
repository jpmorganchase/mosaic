import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  publishSnapshots,
  supportsTrustedPublishing,
  tryTokenExchange
} from '../publishTarballs.mjs';
import { packageTarball } from './tarball.mjs';

const VERSION = '0.0.0-snapshot-20261002090000';

it('requires npm 11.5.1 or later for trusted publishing', () => {
  expect(supportsTrustedPublishing('11.5.1')).toBe(true);
  expect(supportsTrustedPublishing('12.0.0\n')).toBe(true);
  expect(supportsTrustedPublishing('11.5.0')).toBe(false);
  expect(supportsTrustedPublishing('10.9.2')).toBe(false);
});

it('tryTokenExchange never returns the publish token npm hands out', async () => {
  const fetchImpl = vi.fn(async url =>
    String(url).startsWith('https://token.actions.example')
      ? { ok: true, status: 200, json: async () => ({ value: 'github-id-token' }) }
      : { ok: true, status: 201, json: async () => ({ token: 'npm-publish-token' }) }
  );
  const env = {
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example/?api-version=2.0',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token'
  };

  const result = await tryTokenExchange('@jpmorganchase/mosaic-types', { env, fetchImpl });

  expect(result).toEqual({ ok: true, status: 201, message: undefined });
  expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('audience')).toBe(
    'npm:registry.npmjs.org'
  );
  expect(fetchImpl.mock.calls[1][0]).toBe(
    'https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@jpmorganchase%2fmosaic-types'
  );
});

describe('publishSnapshots', () => {
  let root;
  let dir;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'snapshot-publish-'));
    dir = path.join(root, 'tarballs');
    await mkdir(path.join(root, 'packages', 'types'), { recursive: true });
    await writeFile(
      path.join(root, 'packages', 'types', 'package.json'),
      JSON.stringify({ name: '@jpmorganchase/mosaic-types' })
    );
    await mkdir(dir);
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function fakeNpm({ version = '11.6.2' } = {}) {
    return vi.fn(async (command, args) => {
      if (args[0] === '--version') return { code: 0, stdout: `${version}\n` };
      if (args.includes('--dry-run')) {
        return {
          code: 0,
          stdout: JSON.stringify({ name: '@jpmorganchase/mosaic-types', version: VERSION })
        };
      }
      return { code: 0, stdout: '' };
    });
  }
  const realPublishes = exec =>
    exec.mock.calls.filter(([, args]) => args[0] === 'publish' && !args.includes('--dry-run'));

  it('publishes under the snapshot tag to npm, without provenance or scripts', async () => {
    const exec = fakeNpm();

    const result = await publishSnapshots({ dir, repoRoot: root, exec, log: () => {} });

    expect(result).toEqual({ published: [`@jpmorganchase/mosaic-types@${VERSION}`], failed: [] });
    expect(realPublishes(exec)).toEqual([
      [
        'npm',
        [
          'publish',
          path.join(dir, 'types.tgz'),
          '--registry=https://registry.npmjs.org',
          '--tag',
          'snapshot',
          '--access',
          'public',
          '--provenance=false',
          '--ignore-scripts'
        ]
      ]
    ]);
  });

  it('only tries the token exchange in a dry run', async () => {
    const exec = fakeNpm();
    const exchange = vi.fn(async () => ({ ok: true, status: 201 }));

    await publishSnapshots({ dir, repoRoot: root, dryRun: true, exec, exchange, log: () => {} });

    expect(exchange).toHaveBeenCalledWith('@jpmorganchase/mosaic-types');
    expect(realPublishes(exec)).toEqual([]);
  });

  it('publishes nothing if any tarball fails its checks', async () => {
    await writeFile(path.join(dir, 'evil.tgz'), packageTarball({ name: 'left-pad' }));
    const exec = fakeNpm();

    await expect(publishSnapshots({ dir, repoRoot: root, exec, log: () => {} })).rejects.toThrow(
      /evil\.tgz/
    );
    expect(realPublishes(exec)).toEqual([]);
  });

  it('publishes nothing with an npm that cannot use trusted publishing', async () => {
    const exec = fakeNpm({ version: '10.9.2' });

    await expect(publishSnapshots({ dir, repoRoot: root, exec, log: () => {} })).rejects.toThrow(
      /11\.5\.1/
    );
    expect(realPublishes(exec)).toEqual([]);
  });
});
