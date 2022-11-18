import { WatchOptions } from 'fs';
import { Observable } from 'rxjs';
import { watch } from 'chokidar';
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
  return new Observable(subscriber => {
    const watcher = watch(filename, options as any);

    watcher.on('all', (_eventType, filename) => {
      subscriber.next(filename);
    });

    watcher.once('error', (error: Error) => {
      subscriber.error(error);
    });

    watcher.once('close', async () => {
      await watcher.close();
      subscriber.complete();
    });

    return function unsubscribe() {
      watcher.emit('close');
    };
  });
}
