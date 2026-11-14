import { Worker } from 'node:worker_threads';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildExecArgv } from '../operators/ObservableWorker.js';

afterEach(() => vi.unstubAllEnvs());

describe('source Worker startup', () => {
  test.each(['--max-old-space-size=256', '--max-semi-space-size=16'])(
    'starts a real Worker with %s configured',
    async flag => {
      vi.stubEnv('NODE_OPTIONS', flag);
      const worker = new Worker('require("node:worker_threads").parentPort.postMessage("ready")', {
        eval: true,
        execArgv: buildExecArgv()
      });
      try {
        const message = await new Promise((resolve, reject) => {
          worker.once('message', resolve);
          worker.once('error', reject);
        });
        expect(message).toBe('ready');
      } finally {
        await worker.terminate();
      }
    }
  );

  test('retains the separate inspector port without forwarding V8 flags', () => {
    vi.stubEnv('NODE_OPTIONS', '--inspect-brk --max-old-space-size=256');
    expect(buildExecArgv()).toEqual(['--inspect=0.0.0.0:0']);
  });
});
