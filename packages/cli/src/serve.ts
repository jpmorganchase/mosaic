import Fastify from 'fastify';
import cors from 'cors';
import { MosaicConfig } from '@jpmorganchase/mosaic-types';
import middie from '@fastify/middie';

import fastifyMosaic from './plugins/mosaicFastifyPlugin.js';
import fastifyMosaicAdmin from './plugins/mosaicAdminPlugin.js';
import fastifyMosaicWorkflows from './plugins/mosaicWorkflowsPlugin.js';
import { createMosaicInstance } from './plugins/createMosaicInstance.js';
import { startRevalidateNotifier } from './revalidateNotifier.js';

const MOSAIC_ADMIN_PREFIX = '_mosaic_';

export const server = Fastify({
  logger: false,
  pluginTimeout: 20000
});

export default async function serve(config: MosaicConfig, port: number, scope?: string[]) {
  const mosaic = await createMosaicInstance(config);

  // Notify a downstream site to flush its tagged content cache whenever
  // a source emits an update. No-op unless `MOSAIC_REVALIDATE_URL` and
  // `MOSAIC_REVALIDATE_SECRET` are set in the CLI process env. See
  // `revalidateNotifier.ts` for the contract.
  startRevalidateNotifier(mosaic);

  await server.register(middie);
  await server.register(fastifyMosaic, { config, scope, mosaic });
  await server.register(fastifyMosaicWorkflows);
  await server.register(fastifyMosaicAdmin, {
    prefix: MOSAIC_ADMIN_PREFIX,
    enableSourcePush: config.enableSourcePush
  });

  // intentionally unused request parameter
  server.get('/actuator/keepalive', async (_request, reply) => {
    return reply.code(200).send('OK');
  });

  server.use(cors());

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
