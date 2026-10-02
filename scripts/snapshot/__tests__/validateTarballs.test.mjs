import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkSnapshotTarballs,
  checkTarball,
  readPublicPackageNames,
  readTarEntries
} from '../validateTarballs.mjs';
import { makeTarball, manifest, packageTarball, paxPath } from './tarball.mjs';

const allowedNames = new Set(['@jpmorganchase/mosaic-types', '@jpmorganchase/mosaic-core']);
const check = tarball => checkTarball(tarball, { allowedNames });

describe('checkTarball', () => {
  it('accepts a snapshot of a public package', () => {
    expect(check(packageTarball())).toEqual({
      name: '@jpmorganchase/mosaic-types',
      version: '0.0.0-snapshot-20261002090000'
    });
  });

  it('accepts directory entries, ustar prefixes and pax and GNU long names', () => {
    const longName = `package/${'a'.repeat(120)}.js`;
    expect(
      check(
        makeTarball([
          { path: 'package/', type: '5' },
          { path: 'package/dist/', type: '5' },
          { path: 'package.json', prefix: 'package', content: manifest() },
          { path: 'PaxHeader', type: 'x', content: paxPath(longName) },
          { path: 'ignored-by-pax', content: 'x' },
          { path: '././@LongLink', type: 'L', content: `package/${'b'.repeat(120)}.js` },
          { path: 'ignored-by-gnu', content: 'y' }
        ])
      ).name
    ).toBe('@jpmorganchase/mosaic-types');
  });

  it.each([
    ['a release version', { version: '0.1.0-beta.99' }],
    ['a stable version', { version: '2026.1.0' }],
    ['a malformed snapshot version', { version: '0.0.0-snapshot-2026' }],
    ['a package from elsewhere', { name: 'left-pad' }],
    ['a private package', { private: true }],
    ['a publishConfig', { publishConfig: { tag: 'latest' } }],
    ['a registry override', { publishConfig: { registry: 'https://evil.example' } }],
    ['an install script', { scripts: { postinstall: 'node steal.js' } }],
    ['a preinstall script', { scripts: { preinstall: 'curl evil' } }]
  ])('rejects %s', (_, fields) => {
    expect(() => check(packageTarball(fields))).toThrow();
  });

  it.each([
    ['outside package/', 'other/file.js'],
    ['a parent segment', 'package/../escape.js'],
    ['a leading ./', './package/file.js'],
    ['a ./ segment', 'package/./file.js'],
    ['an absolute path', '/package/file.js'],
    ['an empty segment', 'package//file.js'],
    ['a backslash', 'package\\..\\file.js'],
    ['a second root directory', 'package2/file.js']
  ])('rejects a path with %s', (_, entryPath) => {
    expect(() => check(packageTarball({}, [{ path: entryPath, content: 'x' }]))).toThrow(
      /outside package\/|plain path/
    );
  });

  it.each([
    ['a symlink', '2'],
    ['a hard link', '1'],
    ['a character device', '3'],
    ['a fifo', '6'],
    ['a global pax header', 'g']
  ])('rejects %s', (_, type) => {
    expect(() =>
      check(packageTarball({}, [{ path: 'package/link', type, linkname: '/etc/passwd' }]))
    ).toThrow(/not a regular file/);
  });

  it('rejects a pax path that escapes package/', () => {
    expect(() =>
      check(
        packageTarball({}, [
          { path: 'PaxHeader', type: 'x', content: paxPath('package/../../evil.js') },
          { path: 'package/innocent.js', content: 'x' }
        ])
      )
    ).toThrow(/outside package\/|plain path/);
  });

  it('rejects duplicate entries, including a second manifest', () => {
    expect(() =>
      check(packageTarball({}, [{ path: 'package/dist/index.js', content: 'again' }]))
    ).toThrow(/more than once/);
    expect(() =>
      check(
        packageTarball({}, [
          {
            path: 'package/package.json',
            content: manifest({ name: '@jpmorganchase/mosaic-core' })
          }
        ])
      )
    ).toThrow(/more than once/);
  });

  it('rejects a missing or unreadable manifest', () => {
    expect(() => check(makeTarball([{ path: 'package/index.js', content: 'x' }]))).toThrow(
      /package.json is missing/
    );
    expect(() => check(makeTarball([{ path: 'package/package.json', content: '{' }]))).toThrow(
      /not valid JSON/
    );
  });

  it('rejects corrupt and truncated archives', () => {
    const archive = makeTarball([{ path: 'package/package.json', content: manifest() }]);
    const raw = Buffer.from(gunzipSync(archive));
    raw[0] = 'X'.charCodeAt(0);
    expect(() => check(gzipSync(raw))).toThrow(/checksum/);

    const truncated = gunzipSync(archive).subarray(0, 520);
    expect(() => readTarEntries(truncated)).toThrow(/truncated/);
  });
});

describe('checkSnapshotTarballs', () => {
  let dir;
  const npmAgrees = vi.fn(async () => undefined);

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'snapshot-tarballs-'));
    npmAgrees.mockReset();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writeTarball = (file, fields) => writeFile(path.join(dir, file), packageTarball(fields));
  const npmReadsManifest = async file => checkTarball(await readFile(file), { allowedNames });

  it('returns every checked tarball', async () => {
    await writeTarball('types.tgz');
    await writeTarball('core.tgz', { name: '@jpmorganchase/mosaic-core' });

    const tarballs = await checkSnapshotTarballs(dir, {
      allowedNames,
      checkWithNpm: npmReadsManifest
    });

    expect(tarballs.map(tarball => tarball.name)).toEqual([
      '@jpmorganchase/mosaic-core',
      '@jpmorganchase/mosaic-types'
    ]);
  });

  it('rejects an empty directory and files that are not tarballs', async () => {
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmAgrees })
    ).rejects.toThrow(/No tarballs/);
    await writeTarball('types.tgz');
    await writeFile(path.join(dir, 'run.sh'), 'echo hi');
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmAgrees })
    ).rejects.toThrow(/Unexpected files/);
  });

  it('rejects two tarballs of the same package', async () => {
    await writeTarball('a.tgz');
    await writeTarball('b.tgz');
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmReadsManifest })
    ).rejects.toThrow(/more than one tarball/);
  });

  it('rejects tarballs with different versions', async () => {
    await writeTarball('types.tgz');
    await writeTarball('core.tgz', {
      name: '@jpmorganchase/mosaic-core',
      version: '0.0.0-snapshot-20261002090001'
    });
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmReadsManifest })
    ).rejects.toThrow(/different versions/);
  });

  it('rejects a tarball npm reads differently', async () => {
    await writeTarball('types.tgz');
    await expect(
      checkSnapshotTarballs(dir, {
        allowedNames,
        checkWithNpm: async () => ({ name: '@jpmorganchase/mosaic-types', version: '9.9.9' })
      })
    ).rejects.toThrow(/npm reads it as/);
  });

  it('names the tarball that failed', async () => {
    await writeTarball('bad.tgz', { version: '1.0.0' });
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmAgrees })
    ).rejects.toThrow(/^bad\.tgz: .*not a snapshot version/);
  });
});

describe('readPublicPackageNames', () => {
  it('lists the non-private packages', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'snapshot-repo-'));
    try {
      for (const [dir, pkg] of [
        ['types', { name: '@jpmorganchase/mosaic-types' }],
        ['site', { name: '@jpmorganchase/mosaic-site', private: true }]
      ]) {
        await mkdir(path.join(root, 'packages', dir), { recursive: true });
        await writeFile(path.join(root, 'packages', dir, 'package.json'), JSON.stringify(pkg));
      }
      await mkdir(path.join(root, 'packages', 'not-a-package'));

      expect([...(await readPublicPackageNames(root))]).toEqual(['@jpmorganchase/mosaic-types']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
