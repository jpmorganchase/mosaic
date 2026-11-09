import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { SendSourceWorkflowMessage } from '@jpmorganchase/mosaic-types';

import { validateServeEnv } from '../env';
import fastifyMosaicWorkflows from '../plugins/mosaicWorkflowsPlugin';

const secret = 'test-workflows-secret';
const headers = { authorization: `Bearer ${secret}` };
const user = { sid: 'editor' };

afterEach(() => {
  vi.unstubAllEnvs();
});

async function serverWithTimeout(
  configuredTimeout: string,
  run: (send: SendSourceWorkflowMessage) => Promise<boolean>
) {
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', secret);
  const env = validateServeEnv({ MOSAIC_WORKFLOWS_TIMEOUT_MS: configuredTimeout });
  const app = Fastify();
  await app.register(
    fp(
      async instance => {
        instance.decorate('mosaic', {
          core: { triggerWorkflow: run },
          fs: {
            promises: {
              exists: async () => true,
              stat: async () => ({ isDirectory: () => false }),
              realpath: async () => '/docs/page.mdx'
            }
          }
        } as unknown as FastifyInstance['mosaic']);
      },
      { name: 'fastify-mosaic' }
    )
  );
  await app.register(fastifyMosaicWorkflows, { timeoutMs: env.workflowsTimeoutMs });
  await app.ready();
  return app;
}

function startJob(app: FastifyInstance, sid = user.sid) {
  return app.inject({
    method: 'POST',
    url: '/workflows/jobs',
    headers,
    payload: { user: { sid }, route: '/docs/page', name: 'save' }
  });
}

async function runJob(app: FastifyInstance, sid = user.sid) {
  const started = await startJob(app, sid);
  expect(started.statusCode).toBe(202);
  return app.inject({
    method: 'GET',
    url: `/workflows/jobs/${started.json().jobId}/events?user=${sid}`,
    headers
  });
}

describe('workflow timeout configuration at the HTTP plugin boundary', () => {
  test('fails an unfinished job after the validated timeout', async () => {
    const app = await serverWithTimeout('50', () => new Promise(() => {}));
    try {
      const events = await runJob(app);
      expect(events.body).toContain('event: done');
      expect(events.body).toContain('"status":"ERROR"');
      expect(events.body).toContain('The workflow did not finish within 50 ms.');
      expect(events.body).not.toContain('SUCCESS');
    } finally {
      await app.close();
    }
  });

  test('the maximum supported timeout does not overflow into an immediate failure', async () => {
    const app = await serverWithTimeout('2147483647', async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return true;
    });
    try {
      const events = await runJob(app);
      expect(events.body).toContain('event: done');
      expect(events.body).toContain('"status":"SUCCESS"');
      expect(events.body).not.toContain('ERROR');
    } finally {
      await app.close();
    }
  });

  test('rejects a retry of a timed-out save until its execution settles', async () => {
    let finish = () => {};
    const waiting = new Promise<void>(resolve => {
      finish = resolve;
    });
    const run = vi
      .fn()
      .mockImplementationOnce(async () => {
        await waiting;
        return true;
      })
      .mockResolvedValue(true);
    const app = await serverWithTimeout('50', run);
    try {
      const events = await runJob(app);
      expect(events.body).toContain('It may still finish.');
      const retry = await startJob(app);
      expect(retry.statusCode).toBe(409);
      expect(run).toHaveBeenCalledTimes(1);

      const otherUser = await runJob(app, 'another-editor');
      expect(otherUser.body).toContain('"status":"SUCCESS"');
      finish();
      await waiting;
      const afterSettling = await runJob(app);
      expect(afterSettling.body).toContain('"status":"SUCCESS"');
      expect(run).toHaveBeenCalledTimes(3);
    } finally {
      finish();
      await app.close();
    }
  });
});
