import { Worker } from 'worker_threads';

import { Observable } from 'rxjs';

import type WorkerData from '@jpmorganchase/mosaic-types/dist/WorkerData';

export function from<T>(workerData: WorkerData) {
  return new Observable<T>(observer => {
    const worker = new Worker(require.resolve('../worker/Source.worker'), { workerData });
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
