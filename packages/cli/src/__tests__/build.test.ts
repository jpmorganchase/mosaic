import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const coreConstructed = vi.fn();
let sourceUpdated: ((filesystem: unknown, source: { id: symbol }) => Promise<void>) | undefined;
const unsubscribe = vi.fn(() => {
  sourceUpdated = undefined;
});
const filesystem = {
  scope: vi.fn(),
  symlinksToJSON: vi.fn(),
  promises: {
    glob: vi.fn(),
    readFile: vi.fn()
  }
};
const core = {
  start: vi.fn(),
  stop: vi.fn(),
  onSourceUpdate: vi.fn(),
  filesystem
};

vi.mock('@jpmorganchase/mosaic-core', () => ({
  default: vi.fn().mockImplementation(function MosaicCoreMock(config) {
    coreConstructed(config);
    return core;
  })
}));

const { default: build } = await import('../build.js');

let outDir: string;

function config() {
  return { plugins: [], sources: [] };
}

beforeEach(async () => {
  core.start.mockResolvedValue(undefined);
  core.stop.mockResolvedValue(undefined);
  core.onSourceUpdate.mockImplementation(callback => {
    sourceUpdated = callback;
    return unsubscribe;
  });
  filesystem.scope.mockReturnValue(filesystem);
  filesystem.symlinksToJSON.mockReturnValue({});
  filesystem.promises.glob.mockResolvedValue([]);
  filesystem.promises.readFile.mockReset();
  outDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-build-'));
});

afterEach(async () => {
  vi.clearAllMocks();
  sourceUpdated = undefined;
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

  test('THEN it captures a fast source update during startup and writes after the slower source updates', async () => {
    const fast = { id: Symbol('fast') };
    const slow = { id: Symbol('slow') };
    core.start.mockImplementation(async () => {
      await sourceUpdated?.(filesystem, fast);
    });
    filesystem.promises.glob.mockResolvedValue(['/fast.mdx', '/slow.mdx']);
    filesystem.promises.readFile.mockImplementation(async file => [Buffer.from(file)]);

    await build({ plugins: [], sources: [{}, {}] }, outDir, { name: 'latest' });

    expect(filesystem.promises.glob).not.toHaveBeenCalled();
    expect(core.stop).not.toHaveBeenCalled();
    await sourceUpdated?.(filesystem, slow);

    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'fast.mdx'), 'utf8')
    ).resolves.toBe('/fast.mdx');
    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'slow.mdx'), 'utf8')
    ).resolves.toBe('/slow.mdx');
    expect(core.stop).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  test('THEN it waits for startup to mount all filesystems before scoping updates received during startup', async () => {
    let mounted = false;
    core.start.mockImplementation(async () => {
      await sourceUpdated?.(filesystem, { id: Symbol('first') });
      await sourceUpdated?.(filesystem, { id: Symbol('second') });
      expect(filesystem.scope).not.toHaveBeenCalled();
      mounted = true;
    });
    filesystem.scope.mockImplementation(() => {
      expect(mounted).toBe(true);
      return filesystem;
    });
    filesystem.promises.glob.mockResolvedValue(['/salt/index.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('complete snapshot')]);

    await build({ plugins: [], sources: [{}, {}] }, outDir, { name: 'latest', scope: 'salt' });

    expect(filesystem.scope).toHaveBeenCalledExactlyOnceWith(['salt']);
    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'salt', 'index.mdx'), 'utf8')
    ).resolves.toBe('complete snapshot');
    expect(core.stop).toHaveBeenCalledOnce();
  });

  test('THEN repeated early updates cannot replace a slower enabled source or wait for a disabled source', async () => {
    const fast = { id: Symbol('fast') };
    const slow = { id: Symbol('slow') };
    core.start.mockImplementation(async () => {
      await sourceUpdated?.(filesystem, fast);
      await sourceUpdated?.(filesystem, fast);
    });
    filesystem.promises.glob.mockResolvedValue(['/complete.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('both sources ready')]);

    await build({ plugins: [], sources: [{}, {}, { disabled: true }] }, outDir, { name: 'latest' });

    expect(filesystem.promises.glob).not.toHaveBeenCalled();
    expect(core.stop).not.toHaveBeenCalled();
    const notify = sourceUpdated;
    await Promise.all([notify?.(filesystem, slow), notify?.(filesystem, slow)]);

    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'complete.mdx'), 'utf8')
    ).resolves.toBe('both sources ready');
    expect(filesystem.promises.glob).toHaveBeenCalledOnce();
    expect(core.stop).toHaveBeenCalledOnce();
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
