import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Observable } from 'rxjs';
import type { WorkerData } from '@jpmorganchase/mosaic-types';

const require = createRequire(import.meta.url);

/**
 * Resolve the per-worker old-generation heap cap (MiB), honouring
 * `MOSAIC_WORKER_MAX_OLD_SPACE_MB` first and falling back to whatever
 * `--max-old-space-size=N` is present in the parent's `NODE_OPTIONS`.
 *
 * Returns `null` when nothing is configured — in which case we leave
 * `resourceLimits` unset and Node applies its built-in per-isolate
 * default (~physical-RAM-derived on 64-bit hosts). We deliberately do
 * NOT synthesise a default, because doing so silently *lowers* the
 * effective cap on hosts whose RAM-derived default already exceeds
 * any plausible hard-coded fallback.
 *
 * `MOSAIC_WORKER_MAX_OLD_SPACE_MB=0` (or any non-positive value) is
 * the explicit way to ignore an inherited `NODE_OPTIONS` cap and
 * force Node's default.
 */
function resolveWorkerMaxOldSpaceMb(parentOpts: string): number | null {
  const envOverride = process.env.MOSAIC_WORKER_MAX_OLD_SPACE_MB;
  if (envOverride !== undefined) {
    const n = Number.parseInt(envOverride, 10);
    if (Number.isFinite(n) && n > 0) return n;
    return null;
  }
  const m = parentOpts.match(/--max-old-space-size=(\d+)/);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

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
 * NOTE: `--max-old-space-size` / `--max-semi-space-size` are NOT valid
 * `execArgv` entries for `worker_threads` — Node throws
 * `ERR_WORKER_INVALID_EXEC_ARGV` synchronously inside the `Worker`
 * constructor. The correct surface for per-worker heap caps is the
 * `resourceLimits` constructor option, which we set separately via
 * {@link buildResourceLimits}.
 */
function buildExecArgv(): string[] {
  const out: string[] = [];
  const parentOpts = process.env.NODE_OPTIONS ?? '';
  if (/--inspect(=|$|\s)/.test(parentOpts) || /--inspect-brk(=|$|\s)/.test(parentOpts)) {
    out.push('--inspect=0.0.0.0:0');
  }
  return out;
}

/**
 * Translate the parent's heap-cap configuration into the Node Worker
 * `resourceLimits` shape, or `undefined` when nothing is configured
 * (in which case we spread nothing and Node uses its built-in
 * per-isolate default).
 */
function buildResourceLimits(): { maxOldGenerationSizeMb: number } | undefined {
  const parentOpts = process.env.NODE_OPTIONS ?? '';
  const maxOldSpaceMb = resolveWorkerMaxOldSpaceMb(parentOpts);
  return maxOldSpaceMb != null ? { maxOldGenerationSizeMb: maxOldSpaceMb } : undefined;
}

export default function from<T>(workerData: WorkerData) {
  return new Observable<T>(observer => {
    const resourceLimits = buildResourceLimits();
    const worker = new Worker(require.resolve('../worker/Source.worker'), {
      workerData,
      execArgv: buildExecArgv(),
      ...(resourceLimits ? { resourceLimits } : {})
    });
    // Node fires both `error` and `exit` on worker OOM (and
    // sometimes plugin throws). Without this guard rxjs would
    // receive a second terminal call on an already-closed
    // subscription and rethrow asynchronously — visible as an
    // unhandled rejection on stricter Node configs.
    let settled = false;
    worker.on('message', message => {
      if (!settled) observer.next(message);
    });
    worker.once('error', error => {
      if (settled) return;
      settled = true;
      // `ERR_WORKER_OUT_OF_MEMORY`'s built-in message tells you
      // *what* happened but not *what to do*. Decorate with the
      // env-var knob users almost always need to reach for.
      if ((error as NodeJS.ErrnoException)?.code === 'ERR_WORKER_OUT_OF_MEMORY') {
        error.message =
          `${error.message}. The Mosaic source worker exceeded its V8 old-space limit. ` +
          `Raise it via the MOSAIC_WORKER_MAX_OLD_SPACE_MB env var ` +
          `(e.g. MOSAIC_WORKER_MAX_OLD_SPACE_MB=8192) or by passing ` +
          `--max-old-space-size to NODE_OPTIONS on the parent process.`;
      }
      observer.error(error);
    });
    worker.once('exit', code => {
      if (settled) return;
      settled = true;
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
