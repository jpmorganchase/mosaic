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
  shouldUpdateNamespaceSources: vi.fn()
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

describe('source generations', () => {
  let worker: EventEmitter & { closed: boolean; stop: () => void };

  beforeEach(() => {
    worker = Object.assign(new EventEmitter(), {
      closed: false,
      stop() {
        this.closed = true;
        this.emit(EVENT.EXIT);
      }
    });
    vi.mocked(WorkerSubscription).mockImplementation(function WorkerMock() {
      return worker as never;
    });
    plugin.afterUpdate.mockReset();
  });

  async function start() {
    const manager = new SourceManager({}, {}, [], [], ['.mdx'], []);
    const started = manager.addSource({ modulePath: 'fixture', namespace: 'docs' }, {});
    await vi.waitFor(() => expect(worker.listenerCount(EVENT.START)).toBe(1));
    worker.emit(EVENT.START);
    return { manager, source: await started };
  }

  function emit(generation: number) {
    worker.emit(EVENT.UPDATE, {
      data: {
        pages: { '/page.mdx': `generation ${generation}` },
        symlinks: { '/alias.mdx': [{ target: '/page.mdx', type: 'file' }] },
        data: { generation }
      }
    });
  }

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
