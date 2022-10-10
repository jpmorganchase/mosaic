import { PathLike, watch, WatchOptions } from 'fs';
import { Observable } from 'rxjs';

export default function fromFsWatch(
  filename: PathLike,
  options?:
    | WatchOptions
    | BufferEncoding
    | string
    | null
    | (WatchOptions & { encoding: 'buffer' })
    | 'buffer'
) {
  return new Observable(subscriber => {
    const watcher = watch(filename, options as any, (_eventType, filename) => {
      subscriber.next(filename);
    });

    watcher.once('error', (error: Error) => {
      subscriber.error(error);
    });

    watcher.once('close', () => {
      subscriber.complete();
    });

    return function unsubscribe() {
      watcher.close();
    };
  });
}
