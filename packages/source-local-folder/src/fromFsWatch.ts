import fs from 'fs';
import path from 'path';
import type { WatchOptions } from 'fs';
import { Observable } from 'rxjs';

/**
 * Emits the (relative) filename whenever something changes under `filename`.
 *
 * Backed by Node's built-in `fs.watch`. Falls back to manually watching every
 * subdirectory if the platform/Node version doesn't support recursive watching.
 */
export default function fromFsWatch(
  filename: string,
  options?:
    | WatchOptions
    | BufferEncoding
    | string
    | null
    | (WatchOptions & { encoding: 'buffer' })
    | 'buffer'
) {
  const normalizedOptions: WatchOptions | undefined =
    options && typeof options === 'object' ? (options as WatchOptions) : undefined;
  const wantsRecursive = !!normalizedOptions?.recursive;

  return new Observable<string>(subscriber => {
    const watchers: fs.FSWatcher[] = [];
    let unsubscribed = false;

    const attach = (target: string, opts?: WatchOptions) => {
      const watcher = fs.watch(target, (opts ?? {}) as Parameters<typeof fs.watch>[1]);
      watcher.on('change', (_eventType, changed) => {
        const name = typeof changed === 'string' ? changed : changed?.toString() ?? '';
        subscriber.next(name);
      });
      watcher.on('error', err => subscriber.error(err));
      watchers.push(watcher);
      return watcher;
    };

    try {
      if (!wantsRecursive) {
        attach(filename, normalizedOptions);
      } else {
        try {
          // Try native recursive watch first (macOS/Windows always, Linux >= 20).
          attach(filename, normalizedOptions);
        } catch (err: unknown) {
          const code = (err as NodeJS.ErrnoException)?.code;
          if (code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM' || code === 'ENOSYS') {
            // Manual recursive fallback.
            const watchedDirs = new Set<string>();
            const watchDir = (dir: string) => {
              if (watchedDirs.has(dir) || unsubscribed) return;
              watchedDirs.add(dir);
              const w = attach(dir, { ...normalizedOptions, recursive: false });
              w.on('change', (_eventType, changed) => {
                const child = typeof changed === 'string' ? changed : changed?.toString();
                if (!child) return;
                const full = path.join(dir, child);
                fs.promises
                  .stat(full)
                  .then(stat => {
                    if (stat.isDirectory()) watchDir(full);
                  })
                  .catch(() => {
                    /* removed entry; ignore */
                  });
              });
            };

            const seedRecursive = async (dir: string) => {
              if (unsubscribed) return;
              watchDir(dir);
              const entries = await fs.promises.readdir(dir, { withFileTypes: true });
              await Promise.all(
                entries.filter(e => e.isDirectory()).map(e => seedRecursive(path.join(dir, e.name)))
              );
            };

            seedRecursive(filename).catch(error => subscriber.error(error));
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      subscriber.error(err as Error);
    }

    return function unsubscribe() {
      unsubscribed = true;
      for (const w of watchers) {
        try {
          w.close();
        } catch {
          /* ignore */
        }
      }
      subscriber.complete();
    };
  });
}
