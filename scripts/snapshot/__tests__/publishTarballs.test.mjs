import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  npmDryRun,
  publishSnapshots,
  supportsTrustedPublishing,
  tryTokenExchange
} from '../publishTarballs.mjs';
import { packageTarball } from './tarball.mjs';

const VERSION = '0.0.0-snapshot-20261002090000';

describe('supportsTrustedPublishing', () => {
  it.each(['11.5.1', '11.5.2', '11.11.0', '12.0.0', '11.6.0\n'])('accepts npm %j', version =>
    expect(supportsTrustedPublishing(version)).toBe(true)
  );

  it.each(['11.5.0', '11.4.9', '10.9.2', 'not a version'])('rejects npm %j', version =>
    expect(supportsTrustedPublishing(version)).toBe(false)
  );
});

describe('npmDryRun', () => {
  it('reads the name and version npm reports', async () => {
    const exec = vi.fn(async () => ({
      code: 0,
      stdout: JSON.stringify({ id: 'x', name: '@jpmorganchase/mosaic-types', version: VERSION })
    }));
    await expect(npmDryRun('/tmp/types.tgz', { exec })).resolves.toEqual({
      name: '@jpmorganchase/mosaic-types',
      version: VERSION
    });
    expect(exec).toHaveBeenCalledWith(
      'npm',
      expect.arrayContaining(['publish', '/tmp/types.tgz', '--dry-run', '--json']),
      { capture: true }
    );
  });

  it('reads reports keyed by package name', async () => {
    const exec = async () => ({
      code: 0,
      stdout: JSON.stringify({ '@jpmorganchase/mosaic-types': { name: 'a', version: 'b' } })
    });
    await expect(npmDryRun('/tmp/types.tgz', { exec })).resolves.toEqual({
      name: 'a',
      version: 'b'
    });
  });

  it('fails when npm does', async () => {
    await expect(
      npmDryRun('/tmp/types.tgz', { exec: async () => ({ code: 1, stdout: '' }) })
    ).rejects.toThrow(/dry-run failed/);
  });
});

describe('tryTokenExchange', () => {
  const env = {
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example/?api-version=2.0',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token'
  };

  it('requires an id-token permission', async () => {
    await expect(tryTokenExchange('@jpmorganchase/mosaic-types', { env: {} })).rejects.toThrow(
      /id-token: write/
    );
  });

  it('exchanges a GitHub token for a package without returning the publish token', async () => {
    const fetchImpl = vi.fn(async url => {
      if (String(url).startsWith('https://token.actions.example')) {
        return { ok: true, status: 200, json: async () => ({ value: 'github-id-token' }) };
      }
      return { ok: true, status: 201, json: async () => ({ token: 'npm-publish-token' }) };
    });

    const result = await tryTokenExchange('@jpmorganchase/mosaic-types', { env, fetchImpl });

    expect(result).toEqual({ ok: true, status: 201, message: undefined });
    expect(JSON.stringify(result)).not.toContain('npm-publish-token');
    const [idUrl, idOptions] = fetchImpl.mock.calls[0];
    expect(new URL(idUrl).searchParams.get('audience')).toBe('npm:registry.npmjs.org');
    expect(idOptions.headers.Authorization).toBe('Bearer request-token');
    const [exchangeUrl, exchangeOptions] = fetchImpl.mock.calls[1];
    expect(exchangeUrl).toBe(
      'https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@jpmorganchase%2fmosaic-types'
    );
    expect(exchangeOptions).toEqual({
      method: 'POST',
      headers: { Authorization: 'Bearer github-id-token' }
    });
  });

  it("reports npm's reason when the exchange is refused", async () => {
    const fetchImpl = async url =>
      String(url).startsWith('https://token.actions.example')
        ? { ok: true, status: 200, json: async () => ({ value: 'github-id-token' }) }
        : {
            ok: false,
            status: 404,
            json: async () => ({ message: 'OIDC token exchange error - package not found' })
          };

    await expect(
      tryTokenExchange('@jpmorganchase/mosaic-types', { env, fetchImpl })
    ).resolves.toEqual({
      ok: false,
      status: 404,
      message: 'OIDC token exchange error - package not found'
    });
  });
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
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function fakeNpm({ version = '11.6.2', publishCode = 0 } = {}) {
    return vi.fn(async (command, args, options) => {
      if (args[0] === '--version') return { code: 0, stdout: `${version}\n` };
      if (args.includes('--dry-run')) {
        return {
          code: 0,
          stdout: JSON.stringify({ name: '@jpmorganchase/mosaic-types', version: VERSION })
        };
      }
      return { code: publishCode, stdout: options?.capture ? '' : undefined };
    });
  }
  const realPublishes = exec =>
    exec.mock.calls.filter(([, args]) => args[0] === 'publish' && !args.includes('--dry-run'));

  it('publishes each checked tarball under the snapshot tag, without provenance', async () => {
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
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
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
    const exec = fakeNpm();
    const exchange = vi.fn(async () => ({ ok: true, status: 201 }));

    const result = await publishSnapshots({
      dir,
      repoRoot: root,
      dryRun: true,
      exec,
      exchange,
      log: () => {}
    });

    expect(result.published).toEqual([`@jpmorganchase/mosaic-types@${VERSION}`]);
    expect(exchange).toHaveBeenCalledWith('@jpmorganchase/mosaic-types');
    expect(realPublishes(exec)).toEqual([]);
  });

  it('reports packages npm refused', async () => {
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
    const result = await publishSnapshots({
      dir,
      repoRoot: root,
      exec: fakeNpm({ publishCode: 1 }),
      log: () => {}
    });
    expect(result).toEqual({ published: [], failed: [`@jpmorganchase/mosaic-types@${VERSION}`] });
  });

  it('publishes nothing if any tarball fails its checks', async () => {
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
    await writeFile(path.join(dir, 'evil.tgz'), packageTarball({ name: 'left-pad' }));
    const exec = fakeNpm();

    await expect(publishSnapshots({ dir, repoRoot: root, exec, log: () => {} })).rejects.toThrow(
      /evil\.tgz/
    );
    expect(realPublishes(exec)).toEqual([]);
  });

  it('stops before publishing with an npm that cannot use trusted publishing', async () => {
    await writeFile(path.join(dir, 'types.tgz'), packageTarball());
    const exec = fakeNpm({ version: '10.9.2' });

    await expect(publishSnapshots({ dir, repoRoot: root, exec, log: () => {} })).rejects.toThrow(
      /11\.5\.1/
    );
    expect(realPublishes(exec)).toEqual([]);
  });
});
