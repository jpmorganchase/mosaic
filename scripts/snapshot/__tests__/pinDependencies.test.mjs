import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { pinSnapshotDependencies } from '../pinDependencies.mjs';

const snapshot = '0.0.0-snapshot-20261116090000';
let root;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'mosaic-snapshot-pins-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function fixture(name, manifest) {
  const dir = path.join(root, 'packages', name);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'package.json');
  const source = JSON.stringify({ name, ...manifest }, null, 2) + '\n';
  await writeFile(file, source);
  return { file, source };
}

test('pins all internal snapshot dependency kinds and leaves external and private packages alone', async () => {
  await fixture('types', { version: snapshot });
  const consumer = await fixture('consumer', {
    version: snapshot,
    dependencies: { types: 'workspace:^', react: '^19.0.0' },
    devDependencies: { types: 'workspace:~' },
    peerDependencies: { types: 'workspace:^' },
    optionalDependencies: { types: 'workspace:*' }
  });
  const privatePackage = await fixture('site', {
    private: true,
    version: '1.0.0',
    dependencies: { types: 'workspace:^' }
  });

  await pinSnapshotDependencies(root);
  const pinned = await readFile(consumer.file, 'utf8');
  expect(JSON.parse(pinned)).toMatchObject({
    dependencies: { types: 'workspace:*', react: '^19.0.0' },
    devDependencies: { types: 'workspace:*' },
    peerDependencies: { types: 'workspace:*' },
    optionalDependencies: { types: 'workspace:*' }
  });
  expect(await readFile(privatePackage.file, 'utf8')).toBe(privatePackage.source);
  await pinSnapshotDependencies(root);
  expect(await readFile(consumer.file, 'utf8')).toBe(pinned);
});

test('normal builds do not change release versions or dependency ranges', async () => {
  await mkdir(path.join(root, 'packages', 'removed-workspace', 'dist'), { recursive: true });
  await fixture('types', { version: '1.0.0' });
  const consumer = await fixture('consumer', {
    version: '1.0.0-beta.1',
    dependencies: { types: 'workspace:^' }
  });
  await pinSnapshotDependencies(root);
  expect(await readFile(consumer.file, 'utf8')).toBe(consumer.source);
});

test.each(['1.0.0', '0.0.0-snapshot-20261116090001'])(
  'rejects mixed public versions before modifying any manifest (%s)',
  async version => {
    await fixture('types', { version });
    const consumer = await fixture('consumer', {
      version: snapshot,
      dependencies: { types: 'workspace:^' }
    });
    await expect(pinSnapshotDependencies(root)).rejects.toThrow('same snapshot version');
    expect(await readFile(consumer.file, 'utf8')).toBe(consumer.source);
  }
);
