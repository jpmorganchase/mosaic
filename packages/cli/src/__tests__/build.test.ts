import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const coreConstructed = vi.fn();
let sourceUpdated: ((filesystem: unknown, source: { id: symbol }) => void) | undefined;
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
  listSources: vi.fn(),
  getNewPageSources: vi.fn(() => [{ prefixDir: 'docs/sdk', writable: true }]),
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
  core.listSources.mockResolvedValue([]);
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
  const routes = JSON.parse(
    await fs.promises.readFile(path.join(outDir, name, 'mosaic-routes.json'), 'utf8')
  );
  expect(routes).toMatchObject({ version: 1, snapshotId: value.id, routes: expect.any(Array) });
  return value;
}

describe('GIVEN the build command', () => {
  test.each(['$afterSource', '$beforeSend', 'afterUpdate', 'afterNamespaceSourceUpdate'])(
    'THEN recorded %s plugin failures abort before writing a completed snapshot',
    async lifecycle => {
      core.listSources.mockResolvedValue([
        {
          name: 'Salt docs',
          pluginErrors: {
            [lifecycle]: [
              {
                pluginName: 'MarkdownConverter',
                name: 'Error',
                message: 'Cannot convert custom MDX',
                fullPath: '/salt/button.mdx'
              }
            ]
          }
        }
      ]);
      await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow(
        `Source 'Salt docs', plugin 'MarkdownConverter' (${lifecycle}) at '/salt/button.mdx': Cannot convert custom MDX`
      );
      expect(unsubscribe).toHaveBeenCalledOnce();
      expect(core.stop).toHaveBeenCalledOnce();
      expect(filesystem.promises.glob).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    }
  );

  test('THEN empty recorded error lists allow the snapshot to complete', async () => {
    core.listSources.mockResolvedValue([{ name: 'Salt docs', pluginErrors: { $beforeSend: [] } }]);
    await build(config(), outDir, { name: 'latest' });
    await identity();
  });
  test('THEN it empties an existing snapshot folder, including nested folders and symlinks', async () => {
    const snapshotDir = path.join(outDir, 'latest');
    await fs.promises.mkdir(path.join(snapshotDir, 'mosaic', 'removed-page'), { recursive: true });
    await fs.promises.writeFile(path.join(snapshotDir, 'mosaic', 'removed-page', 'index.mdx'), '');
    await fs.promises.writeFile(path.join(snapshotDir, 'stale.json'), '{}');
    await fs.promises.symlink('stale.json', path.join(snapshotDir, 'alias.json'));

    await build(config(), outDir, { name: 'latest' });

    await expect(fs.promises.readdir(snapshotDir)).resolves.toEqual([
      'mosaic-new-page-sources.json',
      'mosaic-routes.json',
      'mosaic-snapshot.json'
    ]);
    expect(
      JSON.parse(
        await fs.promises.readFile(path.join(snapshotDir, 'mosaic-new-page-sources.json'), 'utf8')
      )
    ).toEqual({
      version: 1,
      sources: [{ prefixDir: 'docs/sdk', writable: true }]
    });
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

    const building = build({ plugins: [], sources: [{}, {}] }, outDir, { name: 'latest' });
    const completed = vi.fn();
    void building.then(completed);
    await vi.waitFor(() => expect(core.start).toHaveBeenCalledOnce());

    expect(filesystem.promises.glob).not.toHaveBeenCalled();
    expect(core.stop).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    expect(completed).not.toHaveBeenCalled();
    sourceUpdated?.(filesystem, slow);
    await building;
    expect(completed).toHaveBeenCalledOnce();

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

  test.each(['salt', ' salt , salt '])(
    'THEN scope %s selects sources before generation and retains shared artifacts after startup',
    async scope => {
      let mounted = false;
      core.start.mockImplementation(async () => {
        await sourceUpdated?.(filesystem, { id: Symbol('first') });
        await sourceUpdated?.(filesystem, { id: Symbol('second') });
        expect(filesystem.promises.glob).not.toHaveBeenCalled();
        mounted = true;
      });
      filesystem.promises.glob.mockImplementation(async () => {
        expect(mounted).toBe(true);
        return ['/salt/index.mdx', '/sitemap.xml'];
      });
      filesystem.promises.readFile.mockResolvedValue([Buffer.from('complete snapshot')]);

      await build(
        {
          plugins: [],
          sources: [{ namespace: 'salt' }, { namespace: 'salt' }, { namespace: 'other' }]
        },
        outDir,
        { name: 'latest', scope }
      );

      expect(coreConstructed).toHaveBeenCalledWith({
        plugins: [],
        sources: [
          { namespace: 'salt', options: { cache: false } },
          { namespace: 'salt', options: { cache: false } }
        ]
      });
      expect(filesystem.scope).not.toHaveBeenCalled();
      await identity();
      expect(
        JSON.parse(
          await fs.promises.readFile(path.join(outDir, 'latest', 'mosaic-routes.json'), 'utf8')
        ).routes
      ).toEqual([
        { pathname: '/salt/index', sourcePathname: '/salt/index.mdx' },
        { pathname: '/salt/index.mdx', sourcePathname: '/salt/index.mdx' }
      ]);
      await expect(
        fs.promises.readFile(path.join(outDir, 'latest', 'salt', 'index.mdx'), 'utf8')
      ).resolves.toBe('complete snapshot');
      expect(core.stop).toHaveBeenCalledOnce();
      await expect(
        fs.promises.readFile(path.join(outDir, 'latest', 'sitemap.xml'), 'utf8')
      ).resolves.toBe('complete snapshot');
    }
  );

  test.each(['', ',', 'unknown', 'salt,unknown', 'disabled'])(
    'THEN invalid scope %s fails without clearing the existing snapshot',
    async scope => {
      await fs.promises.mkdir(path.join(outDir, 'latest'));
      const existing = path.join(outDir, 'latest', 'keep.txt');
      await fs.promises.writeFile(existing, 'keep');
      await expect(
        build(
          {
            plugins: [],
            sources: [{ namespace: 'salt' }, { namespace: 'disabled', disabled: true }]
          },
          outDir,
          { name: 'latest', scope }
        )
      ).rejects.toThrow('Snapshot scope must name enabled source namespaces');
      expect(coreConstructed).not.toHaveBeenCalled();
      await expect(fs.promises.readFile(existing, 'utf8')).resolves.toBe('keep');
    }
  );

  test('THEN every colliding JSON contributor is merged in filesystem order', async () => {
    filesystem.promises.glob.mockResolvedValue(['/shared.json']);
    filesystem.promises.readFile.mockResolvedValue(
      [
        { first: true, nested: { first: 1, winner: 'first' }, items: ['first'] },
        { second: true, nested: { second: 2, winner: 'second' }, items: ['second'] },
        { third: true, nested: { third: 3, winner: 'third' }, items: ['third'] }
      ].map(value => Buffer.from(JSON.stringify(value)))
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await build(config(), outDir, { name: 'latest' });
    expect(
      JSON.parse(await fs.promises.readFile(path.join(outDir, 'latest', 'shared.json'), 'utf8'))
    ).toEqual({
      first: true,
      second: true,
      third: true,
      nested: { first: 1, second: 2, third: 3, winner: 'third' },
      items: ['first', 'second', 'third']
    });
    await identity();
  });

  test('THEN colliding non-JSON files still fail without a completed identity', async () => {
    filesystem.promises.glob.mockResolvedValue(['/shared.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('first'), Buffer.from('second')]);
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow('overwritten data');
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
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

    const building = build({ plugins: [], sources: [{}, {}, { disabled: true }] }, outDir, {
      name: 'latest'
    });
    await vi.waitFor(() => expect(core.start).toHaveBeenCalledOnce());

    expect(filesystem.promises.glob).not.toHaveBeenCalled();
    expect(core.stop).not.toHaveBeenCalled();
    const notify = sourceUpdated;
    notify?.(filesystem, slow);
    notify?.(filesystem, slow);
    await building;

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
    const chdir = vi.spyOn(process, 'chdir');
    filesystem.promises.glob.mockResolvedValue(['/page.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('complete')]);
    filesystem.symlinksToJSON.mockReturnValue({ '/page': [{ target: '/page.mdx' }] });
    const writeFile = fs.promises.writeFile.bind(fs.promises);
    vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
      if (String(args[0]).endsWith('mosaic-snapshot.json')) {
        const routes = JSON.parse(
          await fs.promises.readFile(path.join(outDir, 'latest', 'mosaic-routes.json'), 'utf8')
        );
        expect(routes.snapshotId).toBe(JSON.parse(String(args[1])).id);
        expect(routes.routes).toContainEqual({ pathname: '/page', sourcePathname: '/page.mdx' });
        expect(await fs.promises.readFile(path.join(outDir, 'latest', 'page'), 'utf8')).toBe(
          'complete'
        );
      }
      return writeFile(...args);
    });
    await build(config(), outDir, { name: 'latest' });
    expect(chdir).not.toHaveBeenCalled();
    await identity();
  });

  test('THEN an alias collision rejects without changing cwd or publishing identity', async () => {
    const cwd = process.cwd();
    filesystem.promises.glob.mockResolvedValue(['/page.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('content')]);
    filesystem.symlinksToJSON.mockReturnValue({ '/page.mdx': [{ target: '/other.mdx' }] });
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toMatchObject({
      code: 'EEXIST'
    });
    expect(process.cwd()).toBe(cwd);
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(core.stop).toHaveBeenCalledOnce();
  });

  test('THEN aliases to internal tag targets are not exported or treated as dangling routes', async () => {
    filesystem.symlinksToJSON.mockReturnValue({ '/internal-tag': [{ target: '/.tags/topic' }] });
    await build(config(), outDir, { name: 'latest' });
    expect(fs.existsSync(path.join(outDir, 'latest', 'internal-tag'))).toBe(false);
    await identity();
  });

  test('THEN startup failure rejects and releases the subscription and sources', async () => {
    core.start.mockRejectedValue(new Error('source failed to start'));
    await expect(build({ plugins: [], sources: [{}] }, outDir, { name: 'latest' })).rejects.toThrow(
      'source failed to start'
    );
    expect(filesystem.promises.glob).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(core.stop).toHaveBeenCalledOnce();
  });

  test.each(
    ['mosaic-snapshot.json', 'mosaic-routes.json'].flatMap(reserved =>
      ['file', 'alias', 'directory'].map(kind => [reserved, kind])
    )
  )('THEN a reserved %s %s collision fails before writing content', async (reserved, kind) => {
    const file = kind === 'directory' ? `/${reserved}/page.mdx` : `/${reserved}`;
    if (kind === 'alias')
      filesystem.symlinksToJSON.mockReturnValue({ [file]: [{ target: '/page.mdx' }] });
    else filesystem.promises.glob.mockResolvedValue([file]);
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow(
      `reserved ${reserved}`
    );
    expect(filesystem.promises.readFile).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
  });

  test('THEN a failed inventory write leaves no completed identity', async () => {
    const writeFile = fs.promises.writeFile.bind(fs.promises);
    vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
      if (String(args[0]).endsWith('mosaic-routes.json')) throw new Error('inventory write failed');
      return writeFile(...args);
    });
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow(
      'inventory write failed'
    );
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
    expect(core.stop).toHaveBeenCalledOnce();
  });

  test.each([{ sources: [] }, { sources: [{ disabled: true }] }])(
    'THEN zero enabled sources produce a valid empty inventory',
    async ({ sources }) => {
      await build({ plugins: [], sources }, outDir, { name: 'latest' });
      await identity();
      expect(
        JSON.parse(
          await fs.promises.readFile(path.join(outDir, 'latest', 'mosaic-routes.json'), 'utf8')
        ).routes
      ).toEqual([]);
    }
  );

  test('THEN a failed content write leaves no identity', async () => {
    filesystem.promises.glob.mockResolvedValue(['/page.mdx']);
    filesystem.promises.readFile.mockResolvedValue([Buffer.from('content')]);
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('disk full'));
    await expect(build(config(), outDir, { name: 'latest' })).rejects.toThrow('disk full');
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(core.stop).toHaveBeenCalledOnce();
    expect(fs.existsSync(path.join(outDir, 'latest', 'mosaic-snapshot.json'))).toBe(false);
  });
});
