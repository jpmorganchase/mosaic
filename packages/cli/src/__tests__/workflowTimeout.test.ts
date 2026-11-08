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

async function runJob(app: FastifyInstance) {
  const started = await app.inject({
    method: 'POST',
    url: '/workflows/jobs',
    headers,
    payload: { user, route: '/docs/page', name: 'save' }
  });
  expect(started.statusCode).toBe(202);
  return app.inject({
    method: 'GET',
    url: `/workflows/jobs/${started.json().jobId}/events?user=${user.sid}`,
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
});
