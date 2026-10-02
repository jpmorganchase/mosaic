import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  checkSnapshotTarballs,
  checkTarball,
  readPublicPackageNames
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

  it('reads directory entries, ustar prefixes and pax and GNU long names', () => {
    const tarball = makeTarball([
      { path: 'package/', type: '5' },
      { path: 'package.json', prefix: 'package', content: manifest() },
      { path: 'PaxHeader', type: 'x', content: paxPath(`package/${'a'.repeat(120)}.js`) },
      { path: 'replaced-by-pax', content: 'x' },
      { path: '././@LongLink', type: 'L', content: `package/${'b'.repeat(120)}.js` },
      { path: 'replaced-by-gnu', content: 'y' }
    ]);
    expect(check(tarball).name).toBe('@jpmorganchase/mosaic-types');
  });

  it.each([
    ['a release version', { version: '0.1.0-beta.99' }],
    ['a package from elsewhere', { name: 'left-pad' }],
    ['a private package', { private: true }],
    ['a registry or tag override', { publishConfig: { registry: 'https://evil.example' } }],
    ['an install script', { scripts: { postinstall: 'node steal.js' } }]
  ])('rejects %s', (_, fields) => {
    expect(() => check(packageTarball(fields))).toThrow();
  });

  it.each(['other/file.js', 'package/../escape.js', '/package/file.js', './package/file.js'])(
    'rejects the path %j',
    entryPath => {
      expect(() => check(packageTarball({}, [{ path: entryPath, content: 'x' }]))).toThrow(
        /outside package\/|plain path/
      );
    }
  );

  it.each([
    ['a symlink', '2'],
    ['a hard link', '1']
  ])('rejects %s', (_, type) => {
    expect(() =>
      check(packageTarball({}, [{ path: 'package/link', type, linkname: '/etc/passwd' }]))
    ).toThrow(/not a regular file/);
  });

  it('rejects a pax path that escapes package/', () => {
    const tarball = packageTarball({}, [
      { path: 'PaxHeader', type: 'x', content: paxPath('package/../../evil.js') },
      { path: 'package/innocent.js', content: 'x' }
    ]);
    expect(() => check(tarball)).toThrow(/outside package\/|plain path/);
  });

  it('rejects a second manifest and a missing one', () => {
    const second = {
      path: 'package/package.json',
      content: manifest({ name: '@jpmorganchase/mosaic-core' })
    };
    expect(() => check(packageTarball({}, [second]))).toThrow(/more than once/);
    expect(() => check(makeTarball([{ path: 'package/index.js', content: 'x' }]))).toThrow(
      /missing/
    );
  });
});

describe('checkSnapshotTarballs', () => {
  let dir;
  const npmReadsManifest = async file => checkTarball(await readFile(file), { allowedNames });
  const writeTarball = (file, fields) => writeFile(path.join(dir, file), packageTarball(fields));

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'snapshot-tarballs-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

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

  it('rejects files that are not tarballs', async () => {
    await writeTarball('types.tgz');
    await writeFile(path.join(dir, 'run.sh'), 'echo hi');
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmReadsManifest })
    ).rejects.toThrow(/Unexpected files/);
  });

  it('rejects two tarballs of the same package', async () => {
    await writeTarball('a.tgz');
    await writeTarball('b.tgz');
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmReadsManifest })
    ).rejects.toThrow(/more than one tarball/);
  });

  it('rejects a tarball npm reads differently', async () => {
    await writeTarball('types.tgz');
    const npmDisagrees = async () => ({ name: '@jpmorganchase/mosaic-types', version: '9.9.9' });
    await expect(
      checkSnapshotTarballs(dir, { allowedNames, checkWithNpm: npmDisagrees })
    ).rejects.toThrow(/npm reads it as/);
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
      expect([...(await readPublicPackageNames(root))]).toEqual(['@jpmorganchase/mosaic-types']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
