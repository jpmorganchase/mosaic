import EventEmitter from 'node:events';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SourceManager from '../SourceManager.js';
import WorkerSubscription, { EVENT } from '../WorkerSubscription.js';

vi.mock('../WorkerSubscription.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../WorkerSubscription.js')>()),
  default: vi.fn()
}));
const plugin = vi.hoisted(() => ({
  afterUpdate: vi.fn(),
  shouldClearCache: vi.fn(),
  shouldUpdateNamespaceSources: vi.fn(),
  afterNamespaceSourceUpdate: vi.fn(),
  afterSourceRemove: vi.fn()
}));
vi.mock('../plugin/index.js', () => ({
  bindSerialiser: async () => ({}),
  bindPluginMethods: async () => plugin
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => {
    resolve = yes;
  });
  return { promise, resolve };
}

function makeWorker() {
  return Object.assign(new EventEmitter(), {
    closed: false,
    stop() {
      this.closed = true;
      this.emit(EVENT.EXIT);
    }
  });
}

describe('source generations', () => {
  let worker: ReturnType<typeof makeWorker>;

  beforeEach(() => {
    worker = makeWorker();
    vi.mocked(WorkerSubscription).mockImplementation(function WorkerMock() {
      return worker as never;
    });
    plugin.afterUpdate.mockReset();
    plugin.shouldUpdateNamespaceSources.mockReset();
    plugin.afterNamespaceSourceUpdate.mockReset();
    plugin.afterSourceRemove.mockReset();
  });

  async function start() {
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
    await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
    worker.emit(EVENT.START);
    return { manager, source: await started };
  }

  function emit(generation: number, target = worker) {
    target.emit(EVENT.UPDATE, {
      data: {
        pages: { '/page.mdx': `generation ${generation}` },
        symlinks: { '/alias.mdx': [{ target: '/page.mdx', type: 'file' }] },
        data: { generation }
      }
    });
  }

  function startWithCache(target = worker) {
    target.emit(EVENT.START, {
      data: {
        pages: { '/page.mdx': 'cached' },
        symlinks: { '/alias.mdx': [{ target: '/page.mdx', type: 'file' }] },
        data: { generation: 'cached' }
      }
    });
  }

  test('hydrates cached pages before queued live content and only notifies on live publications', async () => {
    const hydrate = deferred();
    const live = deferred();
    const mounted = vi.fn();
    const observed: unknown[] = [];
    plugin.afterUpdate.mockImplementation(async (files, { config }) => {
      observed.push([config.data.generation, String(await files.promises.readFile('/alias.mdx'))]);
      await (config.data.generation === 'cached' ? hydrate.promise : live.promise);
    });
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {}, mounted);
    await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
    startWithCache();
    emit(1);

    await vi.waitFor(() => expect(observed).toEqual([['cached', 'cached']]));
    expect(mounted).toHaveBeenCalledOnce();
    expect(publish).not.toHaveBeenCalled();
    hydrate.resolve();
    await started;
    await vi.waitFor(() =>
      expect(observed).toEqual([
        ['cached', 'cached'],
        [1, 'generation 1']
      ])
    );
    expect(publish).not.toHaveBeenCalled();
    live.resolve();
    await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
    expect(fail).not.toHaveBeenCalled();
    manager.destroyAll();
  });

  test('stopping during cached hydration rejects startup and drops queued live work', async () => {
    const hydrate = deferred();
    plugin.afterUpdate.mockImplementation(() => hydrate.promise);
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
    const rejected = expect(started).rejects.toThrow('exited before initialising');
    await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
    startWithCache();
    await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledOnce());
    emit(1);
    manager.destroyAll();
    hydrate.resolve();

    await rejected;
    await new Promise(resolve => setImmediate(resolve));
    expect(manager.listSources()).toEqual([]);
    expect(plugin.afterUpdate).toHaveBeenCalledOnce();
    expect(publish).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledOnce();
  });

  test('a worker error rejects cached startup and cancels queued live work', async () => {
    const hydrate = deferred();
    plugin.afterUpdate.mockImplementation(() => hydrate.promise);
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
    const error = new Error('worker failed');
    const rejected = expect(started).rejects.toThrow(error.message);
    try {
      await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
      startWithCache();
      await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledOnce());
      emit(1);
      worker.emit(EVENT.ERROR, error);
      worker.closed = true;
      worker.emit(EVENT.EXIT);
      hydrate.resolve();

      await rejected;
      await new Promise(resolve => setImmediate(resolve));
      expect(manager.listSources()).toEqual([]);
      expect(plugin.afterUpdate).toHaveBeenCalledOnce();
      expect(publish).not.toHaveBeenCalled();
      expect(fail).toHaveBeenCalledWith(error);
    } finally {
      hydrate.resolve();
      await manager.destroyAll();
    }
  });

  test('a cache that cannot be mounted does not discard the queued live generation', async () => {
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
    try {
      await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
      worker.emit(EVENT.START, {
        data: {
          pages: { '/page.mdx': 'cached', '/occupied': 'not a directory' },
          symlinks: { '/occupied/alias.mdx': [{ target: '/page.mdx', type: 'file' }] },
          data: { generation: 'cached' }
        }
      });
      emit(1);

      const source = await started;
      await vi.waitFor(() => expect(publish).toHaveBeenCalledOnce());
      expect(fail).not.toHaveBeenCalled();
      expect(worker.closed).toBe(false);
      expect(await source.filesystem.promises.exists('/occupied')).toBe(false);
      expect(String(await source.filesystem.promises.readFile('/alias.mdx'))).toBe('generation 1');
    } finally {
      await manager.destroyAll();
    }
  });

  test.each([
    { cache: false, sourceOptions: {}, overrides: {}, expected: false },
    { cache: true, sourceOptions: { cache: false }, overrides: {}, expected: false },
    { cache: true, sourceOptions: {}, overrides: { cache: false }, expected: false },
    { cache: true, sourceOptions: {}, overrides: {}, expected: true }
  ])(
    'propagates cache policy to the worker ($cache, $sourceOptions, $overrides)',
    async scenario => {
      const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
      const started = manager.addSource(
        {
          modulePath: 'fixture',
          namespace: 'docs',
          cache: scenario.cache,
          options: scenario.sourceOptions
        },
        scenario.overrides
      );
      try {
        await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
        worker.emit(EVENT.START);
        await started;
        expect(WorkerSubscription).toHaveBeenCalledWith(
          expect.objectContaining({ options: { cache: scenario.expected } })
        );
      } finally {
        await manager.destroyAll();
      }
    }
  );

  test('stops the boot watchdog on init while still awaiting cached hydration', async () => {
    vi.stubEnv('MOSAIC_SOURCE_BOOT_TIMEOUT_MS', '500');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const hydrate = deferred();
    plugin.afterUpdate.mockImplementation(() => hydrate.promise);
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    try {
      const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
      const settled = vi.fn();
      void started.then(settled, settled);
      await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
      startWithCache();
      await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledOnce());

      await vi.advanceTimersByTimeAsync(600);
      expect(settled).not.toHaveBeenCalled();
      hydrate.resolve();
      await started;
      expect(settled).toHaveBeenCalledOnce();
    } finally {
      hydrate.resolve();
      manager.destroyAll();
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });

  test('an unrelated finite source starts, publishes and exits while another source awaits it', async () => {
    const removed = deferred();
    plugin.afterUpdate.mockImplementation(async (_, { config }) => {
      if (config.data.generation === 1) await removed.promise;
    });
    plugin.afterSourceRemove.mockImplementation(() => removed.resolve());
    const { manager } = await start();
    const peer = makeWorker();
    vi.mocked(WorkerSubscription).mockImplementationOnce(function PeerWorker() {
      return peer as never;
    });
    const publications: number[] = [];
    const fail = vi.fn();
    manager.onSourceUpdate((_, source) => publications.push(source.config.data.generation), fail);
    try {
      emit(1);
      await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledOnce());
      const started = manager.addSource({ modulePath: 'peer', namespace: 'other' }, {});
      await vi.waitFor(() => expect(peer.listenerCount(EVENT.START)).toBe(1));
      peer.emit(EVENT.START);
      emit(2, peer);
      peer.closed = true;
      peer.emit(EVENT.EXIT);
      await started;
      await vi.waitFor(() => expect(publications).toEqual([2, 1]));
      expect(fail).not.toHaveBeenCalled();
      expect(plugin.afterSourceRemove).toHaveBeenCalledOnce();
      expect(manager.listSources()).toHaveLength(1);
    } finally {
      removed.resolve();
      await manager.destroyAll();
    }
  });

  test('awaits publication before changing pages, symlinks or configuration', async () => {
    const gate = deferred();
    const observed: unknown[] = [];
    plugin.afterUpdate.mockImplementation(async (files, { config }) => {
      observed.push([config.data.generation, String(await files.promises.readFile('/alias.mdx'))]);
      if (config.data.generation === 1) await gate.promise;
      observed.push([config.data.generation, String(await files.promises.readFile('/page.mdx'))]);
    });
    const { manager, source } = await start();
    const published: number[] = [];
    manager.onSourceUpdate(() => published.push(source.config.data.generation as number));
    emit(1);
    await vi.waitFor(() => expect(observed).toHaveLength(1));
    emit(2);
    emit(3);
    await new Promise(resolve => setImmediate(resolve));
    expect(plugin.afterUpdate).toHaveBeenCalledTimes(1);
    expect(source.config.data.generation).toBe(1);
    gate.resolve();
    await vi.waitFor(() => expect(published).toEqual([1, 2, 3]));
    expect(observed).toEqual([
      [1, 'generation 1'],
      [1, 'generation 1'],
      [2, 'generation 2'],
      [2, 'generation 2'],
      [3, 'generation 3'],
      [3, 'generation 3']
    ]);
    expect(manager.listSources()).toHaveLength(1);
    expect(String(await source.filesystem.promises.readFile('/alias.mdx'))).toBe('generation 3');
    manager.destroyAll();
  });

  test('finishes a namespace hook before its warm sibling applies a queued live update', async () => {
    const reachedNamespaceDecision = deferred();
    const allowNamespaceDecision = deferred();
    const allowSiblingPublication = deferred();
    const observed: unknown[] = [];
    plugin.afterUpdate.mockImplementation(async (files, { config }) => {
      observed.push([
        'generation',
        config.data.generation,
        String(await files.promises.readFile('/page.mdx'))
      ]);
      if (config.data.generation === 2) await allowSiblingPublication.promise;
    });
    plugin.shouldUpdateNamespaceSources.mockImplementation(async (_, { config }) => {
      if (config.data.generation !== 'cached') return false;
      reachedNamespaceDecision.resolve();
      await allowNamespaceDecision.promise;
      return true;
    });
    plugin.afterNamespaceSourceUpdate.mockImplementation(async (files, { config }) => {
      observed.push([
        'namespace',
        config.data.generation,
        String(await files.promises.readFile('/page.mdx'))
      ]);
    });
    const { manager } = await start();
    const peer = makeWorker();
    vi.mocked(WorkerSubscription).mockImplementationOnce(function PeerWorker() {
      return peer as never;
    });
    const siblingStarted = manager.addSource({ modulePath: 'sibling', namespace: 'docs' }, {});
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    try {
      await vi.waitFor(() => expect(peer.listenerCount(EVENT.START)).toBe(1));
      startWithCache(peer);
      const sibling = await siblingStarted;
      emit(1);
      await reachedNamespaceDecision.promise;
      emit(2, peer);
      await new Promise(resolve => setImmediate(resolve));
      expect(sibling.filesystem.frozen).toBe(true);
      expect(sibling.config.data.generation).toBe('cached');

      allowNamespaceDecision.resolve();
      await vi.waitFor(() =>
        expect(observed).toEqual([
          ['generation', 'cached', 'cached'],
          ['generation', 1, 'generation 1'],
          ['namespace', 'cached', 'cached'],
          ['generation', 2, 'generation 2']
        ])
      );
      allowSiblingPublication.resolve();
      await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
      expect(fail).not.toHaveBeenCalled();
      expect(manager.listSources()).toHaveLength(2);
    } finally {
      allowNamespaceDecision.resolve();
      allowSiblingPublication.resolve();
      await manager.destroyAll();
    }
  });

  test('both concurrent live updates deliver their namespace hooks after the receiver freezes', async () => {
    const allowSibling = deferred();
    plugin.afterUpdate.mockImplementation(async (_, { config }) => {
      if (config.data.generation === 2) await allowSibling.promise;
    });
    plugin.shouldUpdateNamespaceSources.mockResolvedValue(true);
    const observed: unknown[] = [];
    plugin.afterNamespaceSourceUpdate.mockImplementation(async (files, { config }) => {
      const page = String(await files.promises.readFile('/page.mdx'));
      observed.push([config.data.generation, page]);
    });
    const { manager } = await start();
    const peer = makeWorker();
    vi.mocked(WorkerSubscription).mockImplementationOnce(function PeerWorker() {
      return peer as never;
    });
    const siblingStarted = manager.addSource({ modulePath: 'sibling', namespace: 'docs' }, {});
    const publish = vi.fn();
    const fail = vi.fn();
    manager.onSourceUpdate(publish, fail);
    try {
      await vi.waitFor(() => expect(peer.listenerCount(EVENT.START)).toBe(1));
      peer.emit(EVENT.START);
      const sibling = await siblingStarted;
      emit(2, peer);
      await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledOnce());
      expect(sibling.filesystem.frozen).toBe(false);
      emit(1);
      await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledTimes(2));
      expect(publish).not.toHaveBeenCalled();
      expect(observed).toEqual([]);

      allowSibling.resolve();
      await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
      expect(observed).toHaveLength(2);
      expect(observed).toEqual(
        expect.arrayContaining([
          [1, 'generation 1'],
          [2, 'generation 2']
        ])
      );
      expect(fail).not.toHaveBeenCalled();
      expect(manager.listSources()).toHaveLength(2);
    } finally {
      allowSibling.resolve();
      await manager.destroyAll();
    }
  });

  test('discards queued generations when stopped during a plugin', async () => {
    const gate = deferred();
    plugin.afterUpdate.mockImplementation(() => gate.promise);
    const { manager } = await start();
    const published = vi.fn();
    manager.onSourceUpdate(published);
    emit(1);
    await vi.waitFor(() => expect(plugin.afterUpdate).toHaveBeenCalledTimes(1));
    emit(2);
    manager.destroyAll();
    gate.resolve();
    await new Promise(resolve => setImmediate(resolve));
    expect(plugin.afterUpdate).toHaveBeenCalledTimes(1);
    expect(published).not.toHaveBeenCalled();
    expect(manager.listSources()).toEqual([]);
  });
});
