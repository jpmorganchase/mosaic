import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const coreConstructed = vi.fn();

vi.mock('@jpmorganchase/mosaic-core', () => ({
  default: vi.fn().mockImplementation(function MosaicCoreMock(config) {
    coreConstructed(config);
    return {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      onSourceUpdate: vi.fn(),
      filesystem: {}
    };
  })
}));

const { default: build } = await import('../build.js');

let outDir: string;

function config() {
  return { plugins: [], sources: [] };
}

beforeEach(async () => {
  outDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-build-'));
});

afterEach(async () => {
  coreConstructed.mockReset();
  await fs.promises.rm(outDir, { recursive: true, force: true });
});

describe('GIVEN the build command', () => {
  test('THEN it empties an existing snapshot folder, including nested folders and symlinks', async () => {
    const snapshotDir = path.join(outDir, 'latest');
    await fs.promises.mkdir(path.join(snapshotDir, 'mosaic', 'removed-page'), { recursive: true });
    await fs.promises.writeFile(path.join(snapshotDir, 'mosaic', 'removed-page', 'index.mdx'), '');
    await fs.promises.writeFile(path.join(snapshotDir, 'stale.json'), '{}');
    await fs.promises.symlink('stale.json', path.join(snapshotDir, 'alias.json'));

    await build(config(), outDir, { name: 'latest' });

    await expect(fs.promises.readdir(snapshotDir)).resolves.toEqual([]);
  });

  test('THEN it creates the snapshot folder if it does not exist', async () => {
    await build(config(), outDir, { name: 'nested/latest' });

    await expect(fs.promises.readdir(path.join(outDir, 'nested', 'latest'))).resolves.toEqual([]);
  });

  test.each(['..', '../elsewhere', '.', ''])(
    "THEN it refuses the snapshot name '%s' and deletes nothing",
    async name => {
      const sibling = path.join(outDir, 'keep.txt');
      await fs.promises.writeFile(sibling, 'keep');

      await expect(build(config(), outDir, { name })).rejects.toThrow(
        'must be a folder inside the output directory'
      );

      await expect(fs.promises.readFile(sibling, 'utf8')).resolves.toBe('keep');
      expect(coreConstructed).not.toHaveBeenCalled();
    }
  );
});
