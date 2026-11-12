import Fastify from 'fastify';
import cors from 'cors';
import { MosaicConfig } from '@jpmorganchase/mosaic-types';
import middie from '@fastify/middie';

import fastifyMosaic from './plugins/mosaicFastifyPlugin.js';
import fastifyMosaicAdmin from './plugins/mosaicAdminPlugin.js';
import fastifyMosaicWebhooks from './plugins/mosaicWebhooksPlugin.js';
import fastifyMosaicWorkflows from './plugins/mosaicWorkflowsPlugin.js';
import { createMosaicInstance } from './plugins/createMosaicInstance.js';
import { validateServeEnv } from './env.js';
import { startRevalidateNotifier } from './revalidateNotifier.js';

const MOSAIC_ADMIN_PREFIX = '_mosaic_';

export const server = Fastify({
  logger: false,
  pluginTimeout: 20000
});

export default async function serve(config: MosaicConfig, port: number, scope?: string[]) {
  // Refuse to start, listing every problem, before any source boots.
  const env = validateServeEnv();
  const mosaic = await createMosaicInstance(config);

  // Notify a downstream site to flush its tagged content cache whenever
  // a source emits an update. No-op unless `MOSAIC_REVALIDATE_URL` and
  // `MOSAIC_REVALIDATE_SECRET` are set in the CLI process env. See
  // `revalidateNotifier.ts` for the contract.
  startRevalidateNotifier(mosaic, env.revalidate);

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
      await server.listen({ port });
      console.log(
        `[Mosaic] Listening on port ${port}${
          Array.isArray(scope) ? ` (scoped to ${scope.join(', ')})` : ''
        }`
      );
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  await start();
}
