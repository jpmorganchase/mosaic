import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Observable } from 'rxjs';
import type { WorkerData } from '@jpmorganchase/mosaic-types';

const require = createRequire(import.meta.url);

export default function from<T>(workerData: WorkerData) {
  return new Observable<T>(observer => {
    const worker = new Worker(require.resolve('../worker/Source.worker'), {
      workerData
    });
    worker.on('message', message => observer.next(message));
    worker.once('error', error => observer.error(error));
    worker.once('exit', code => {
      if (code !== 0) {
        observer.error(new Error(`mosaic source stopped with exit code ${code}`));
      } else {
        observer.complete();
      }
    });

    return () => {
      worker.terminate();
    };
  });
}
