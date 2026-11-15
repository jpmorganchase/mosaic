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
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sourceUpdated = undefined;
  await fs.promises.rm(outDir, { recursive: true, force: true });
});

async function identity(name = 'latest') {
  const value = JSON.parse(
    await fs.promises.readFile(path.join(outDir, name, 'mosaic-snapshot.json'), 'utf8')
  );
  expect(value).toEqual({ version: 1, id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  return value;
}

describe('GIVEN the build command', () => {
  test('THEN it empties an existing snapshot folder, including nested folders and symlinks', async () => {
    const snapshotDir = path.join(outDir, 'latest');
    await fs.promises.mkdir(path.join(snapshotDir, 'mosaic', 'removed-page'), { recursive: true });
    await fs.promises.writeFile(path.join(snapshotDir, 'mosaic', 'removed-page', 'index.mdx'), '');
    await fs.promises.writeFile(path.join(snapshotDir, 'stale.json'), '{}');
    await fs.promises.symlink('stale.json', path.join(snapshotDir, 'alias.json'));

    await build(config(), outDir, { name: 'latest' });

    await expect(fs.promises.readdir(snapshotDir)).resolves.toEqual(['mosaic-snapshot.json']);
    await identity();
  });

  test('THEN it creates the snapshot folder if it does not exist', async () => {
    await build(config(), outDir, { name: 'nested/latest' });

    await identity('nested/latest');
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
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    await sourceUpdated?.(filesystem, slow);

    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'fast.mdx'), 'utf8')
    ).resolves.toBe('/fast.mdx');
    await expect(
      fs.promises.readFile(path.join(outDir, 'latest', 'slow.mdx'), 'utf8')
    ).resolves.toBe('/slow.mdx');
    expect(core.stop).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    await identity();
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
    await identity();
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

  test('THEN successive builds at the same path publish different identities', async () => {
    await build(config(), outDir, { name: 'latest' });
    const first = await identity();
    await build(config(), outDir, { name: 'latest' });
    expect((await identity()).id).not.toBe(first.id);
  });

  test('THEN identity is published after aliases resolve', async () => {
    filesystem.promises.glob.mockResolvedValue(['/page.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('complete')]);
    filesystem.symlinksToJSON.mockReturnValue({ '/page': [{ target: '/page.mdx' }] });
    const writeFile = fs.promises.writeFile.bind(fs.promises);
    vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
      if (String(args[0]).endsWith('mosaic-snapshot.json')) {
        expect(await fs.promises.readFile(path.join(outDir, 'latest', 'page'), 'utf8')).toBe(
          'complete'
        );
      }
      return writeFile(...args);
    });
    await build(config(), outDir, { name: 'latest' });
    await identity();
  });

  test.each(['file', 'alias', 'directory'])(
    'THEN a reserved identity %s collision fails before writing content',
    async kind => {
      const file =
        kind === 'directory' ? '/mosaic-snapshot.json/page.mdx' : '/mosaic-snapshot.json';
      if (kind === 'alias')
        filesystem.symlinksToJSON.mockReturnValue({ [file]: [{ target: '/page.mdx' }] });
      else filesystem.promises.glob.mockResolvedValue([file]);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow('exit');
      expect(log.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('reserved mosaic-snapshot.json')
        })
      );
      expect(filesystem.promises.readFile).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    }
  );

  test('THEN a failed content write leaves no identity', async () => {
    filesystem.promises.glob.mockResolvedValue(['/page.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('content')]);
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('disk full'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow('exit');
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
  });
});
