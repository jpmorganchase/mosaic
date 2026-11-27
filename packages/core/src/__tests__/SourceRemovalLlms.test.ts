import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Volume } from 'memfs';
import { expect, test, vi } from 'vitest';
import SourceManager from '../SourceManager.js';
import FileAccess from '../filesystems/FileAccess.js';
import MutableVolume from '../filesystems/MutableVolume.js';
import { EVENT } from '../WorkerSubscription.js';

const workers = vi.hoisted(() => new Map<string, EventEmitter>());
// Keep the real plugin loader, source lifecycle and shared filesystem. Only
// substitute worker transport; its data represents already-converted pages.
vi.mock('../WorkerSubscription.js', async importOriginal => {
  const original = await importOriginal<typeof import('../WorkerSubscription.js')>();
  const { EventEmitter } = await import('node:events');
  return {
    ...original,
    default: class extends EventEmitter {
      closed = false;
      constructor({ options }: { options: { prefixDir: string } }) {
        super();
        workers.set(options.prefixDir, this);
      }
      stop() {
        this.closed = true;
        this.emit(original.EVENT.EXIT);
      }
    }
  };
});

test('stopped and exited sources cannot leave pages in global or scoped artifacts', async () => {
  workers.clear();
  const shared = new MutableVolume(new FileAccess(new Volume()), '*');
  const manager = new SourceManager(
    {},
    shared,
    [
      {
        modulePath: fileURLToPath(
          new URL('../../../plugins/src/LlmsTxtPlugin.ts', import.meta.url)
        ),
        options: { scopes: [{ path: '/salt' }, { path: '/mosaic' }] }
      }
    ],
    [],
    ['.mdx'],
    []
  );
  const read = async (file: string) => String(await shared.promises.readFile(file));
  try {
    const started = Promise.all(
      ['salt', 'mosaic'].map(prefixDir =>
        manager.addSource(
          { modulePath: 'fixture-source', namespace: 'shared', options: { prefixDir } },
          {}
        )
      )
    );
    // Importing the real LLM plugin can exceed the default polling timeout.
    // If setup times out, stopping the unfinished sources still rejects startup.
    void started.catch(() => {});
    await vi.waitFor(() => expect(workers.size).toBe(2), { timeout: 3_000 });
    for (const worker of workers.values()) worker.emit(EVENT.START);
    const sources = await started;
    for (const [prefix, worker] of workers) {
      const route = `/${prefix}/page`;
      worker.emit(EVENT.UPDATE, {
        data: {
          pages: {},
          symlinks: {},
          data: {
            markdownPages: { [route]: { title: prefix, markdown: `${prefix} body` } },
            llmsRouteClaims: [route]
          }
        }
      });
    }
    await vi.waitFor(async () => {
      const full = await read('/llms-full.txt');
      expect(full).toContain('salt body');
      expect(full).toContain('mosaic body');
    });

    manager.destroySource(sources[0].id.description!);
    await vi.waitFor(async () => {
      expect(await read('/salt/llms-full.txt')).toBe('');
      expect(await read('/salt/llms.txt')).not.toContain('/salt/page');
      expect(await read('/llms-full.txt')).not.toContain('salt body');
      expect(await read('/llms-full.txt')).toContain('mosaic body');
      expect(JSON.parse(await read('/llms-manifest.json')).routes).toEqual(['/mosaic/page']);
    });

    // Unexpected worker exit, including the final source, reconciles too.
    workers.get('mosaic')!.emit(EVENT.EXIT);
    await vi.waitFor(async () => {
      expect(await read('/llms-full.txt')).toBe('');
      expect(await read('/mosaic/llms-full.txt')).toBe('');
      expect(JSON.parse(await read('/markdown-pages.json')).pages).toEqual({});
      expect(JSON.parse(await read('/llms-manifest.json')).routes).toEqual([]);
    });
    expect(manager.listSources()).toEqual([]);
  } finally {
    manager.destroyAll();
  }
});
