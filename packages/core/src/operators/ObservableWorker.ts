import { Worker } from 'node:worker_threads';
import { Observable } from 'rxjs';
import type { WorkerData } from '@jpmorganchase/mosaic-types';

/**
 * Workers need a relative path to the module you wish to run
 * It should support file urls like file:///path/to/module/code.js but it fails silently
 * Turns this --> file:///where/your/code/lives/mosaic/packages/core/dist/worker/Source.worker.js
 * into this --> ./packages/core/dist/worker/Source.worker.js
 *
 * Note that it's focused on the compiled output (dist directory) not the source.
 */
const resolveModule = async (modulePath: string) => (await import.meta.resolve?.(modulePath)) || '';
const sourceWorkerModule = await resolveModule('../worker/Source.worker.js');
const relativePath = `.${sourceWorkerModule.split('mosaic')[1]}`;

export default function from<T>(workerData: WorkerData) {
  return new Observable<T>(observer => {
    const worker = new Worker(relativePath, {
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
