import Fastify from 'fastify';
import cors from 'cors';
import { MosaicConfig } from '@jpmorganchase/mosaic-types';
import middie from '@fastify/middie';

import fastifyMosaic from './plugins/mosaicFastifyPlugin.js';
import fastifyMosaicAdmin from './plugins/mosaicAdminPlugin.js';
import fastifyMosaicWebhooks from './plugins/mosaicWebhooksPlugin.js';
import fastifyMosaicWorkflows from './plugins/mosaicWorkflowsPlugin.js';
import { createMosaicInstance } from './plugins/createMosaicInstance.js';
import { validateServeEnv, validateHost } from './env.js';
import { startRevalidateNotifier } from './revalidateNotifier.js';

const MOSAIC_ADMIN_PREFIX = '_mosaic_';

export const server = Fastify({
  logger: false,
  pluginTimeout: 20000
});

export default async function serve(
  config: MosaicConfig,
  port: number,
  scope?: string[],
  host = 'localhost'
) {
  validateHost(host);
  // Refuse to start, listing every problem, before any source boots.
  const env = validateServeEnv();
  const mosaic = await createMosaicInstance(config);

  // Notify a downstream site to flush its tagged content cache whenever
  // a source emits an update. No-op unless `MOSAIC_REVALIDATE_URL` and
  // `MOSAIC_REVALIDATE_SECRET` are set in the CLI process env. See
  // `revalidateNotifier.ts` for the contract.
  const notifier = startRevalidateNotifier(mosaic, env.revalidate);
  server.addHook('onClose', async () => notifier.stop());

  await server.register(middie);
  await server.register(fastifyMosaic, { config, scope, mosaic });
  await server.register(fastifyMosaicWorkflows, { timeoutMs: env.workflowsTimeoutMs });
  await server.register(fastifyMosaicAdmin, {
    prefix: MOSAIC_ADMIN_PREFIX,
    enableSourcePush: config.enableSourcePush
  });
  // Bitbucket push webhooks refresh git-repo sources straight away instead
  // of at their next scheduled check. Signed with
  // `MOSAIC_BITBUCKET_WEBHOOK_SECRET`; disabled without it.
  await server.register(fastifyMosaicWebhooks, { prefix: `/${MOSAIC_ADMIN_PREFIX}` });

  // intentionally unused request parameter
  server.get('/actuator/keepalive', async (_request, reply) => {
    return reply.code(200).send('OK');
  });

  // Cross-origin browser access is opt-in: the admin and content routes
  // must not be readable from arbitrary web pages. Set
  // `MOSAIC_CORS_ORIGINS` (comma-separated) to allow specific origins.
  if (env.corsOrigins.length > 0) {
    server.use(cors({ origin: env.corsOrigins }));
  }

  /**
   * Run the server
   */
  const start = async () => {
    try {
      await server.listen({ port, host });
      console.log(
        `[Mosaic] Listening on ${host}:${port}${
          Array.isArray(scope) ? ` (scoped to ${scope.join(', ')})` : ''
        }`
      );
    } catch (err) {
      // The Fastify logger is disabled, so `server.log` would print nothing.
      console.error(listenErrorMessage(err, host, port));
      process.exit(1);
    }
  };
  await start();
}

export function listenErrorMessage(err: unknown, host: string, port: number) {
  const { code, message } = (err ?? {}) as NodeJS.ErrnoException;
  const reason = code === 'EADDRINUSE' ? 'the port is already in use' : message || String(err);
  return `[Mosaic] Unable to listen on ${host}:${port}: ${reason}`;
}
