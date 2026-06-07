import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Observable } from 'rxjs';
import type { WorkerData } from '@jpmorganchase/mosaic-types';

const require = createRequire(import.meta.url);

/**
 * Build an `execArgv` for child Source workers.
 *
 * Node strips `--inspect*` flags from `NODE_OPTIONS` before propagating
 * them to `Worker` threads (to avoid port-collision crashes when many
 * workers spawn). For local debugging — e.g. tracking down a memory
 * leak in a source plugin — we want the inverse: every worker SHOULD be
 * inspectable, just on its own unique port. We re-emit the inspect flag
 * with `port: 0` so the kernel allocates a free port per worker; the
 * Node inspector then publishes its discovery URL on `localhost:9229/json`
 * (the parent's port) alongside the parent target.
 *
 * Memory-limit flags from `NODE_OPTIONS` (`--max-old-space-size` etc.)
 * are NOT auto-inherited by workers either, so we forward those too.
 * Without that, the worker is stuck at Node's ~512MB default no matter
 * what the parent had configured.
 */
function buildExecArgv(): string[] {
  const out: string[] = [];
  const parentOpts = process.env.NODE_OPTIONS ?? '';
  if (/--inspect(=|$|\s)/.test(parentOpts) || /--inspect-brk(=|$|\s)/.test(parentOpts)) {
    out.push('--inspect=0.0.0.0:0');
  }
  for (const flag of ['--max-old-space-size', '--max-semi-space-size']) {
    const m = parentOpts.match(new RegExp(`${flag}=(\\d+)`));
    if (m) out.push(`${flag}=${m[1]}`);
  }
  return out;
}

export default function from<T>(workerData: WorkerData) {
  return new Observable<T>(observer => {
    const worker = new Worker(require.resolve('../worker/Source.worker'), {
      workerData,
      execArgv: buildExecArgv()
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
