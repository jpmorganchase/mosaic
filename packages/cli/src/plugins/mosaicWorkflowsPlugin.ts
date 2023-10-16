import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';
import websocket from '@fastify/websocket';
import type { SendSourceWorkflowMessage } from '@jpmorganchase/mosaic-types';

export interface FastifyMosaicAdminPluginOptions {
  prefix?: string;
  enableSourcePush?: boolean;
}

export interface WorkflowRequestBodyType {
  user: string;
  route: string;
  markdown: string;
  name: string;
}

async function mosaicWorkflows(fastify: FastifyInstance, _options) {
  await fastify.register(websocket);
  const { fs, core } = fastify.mosaic;

  /**
   * Run a workflow
   */
  fastify.get('/workflows', { websocket: true }, (connection /* SocketStream */) => {
    connection.socket.on('message', async message => {
      const sendMessage: SendSourceWorkflowMessage = (message, status) =>
        connection.socket.send(JSON.stringify({ status, message }));

      if (connection.socket.OPEN) {
        try {
          const { type, route: routeReq, name, ...restParams } = JSON.parse(message.toString());

          if (!name) {
            sendMessage('Workflow name is required', 'ERROR');
          }

          if (await fs.promises.exists(routeReq)) {
            const route = (await fs.promises.stat(routeReq)).isDirectory()
              ? path.posix.join(routeReq, 'index')
              : routeReq;
            const pagePath = (await fs.promises.realpath(route)) as string;
            core.triggerWorkflow(sendMessage, name, pagePath, { ...restParams });
            sendMessage(`Workflow ${name} has started`, 'SUCCESS');
          } else {
            sendMessage(`${routeReq} not found`, 'ERROR');
          }
        } catch (e) {
          console.error(e);
          sendMessage(e.message, 'ERROR');
        }
      }
    });
  });
}

/**
 * Fastify plugin that adds support for the Mosaic Workflows
 * https://mosaic-mosaic-dev-team.vercel.app/mosaic/configure/admin/index
 */
export default fp(mosaicWorkflows, {
  fastify: '4.x',
  name: 'fastify-mosaic-workflows',
  dependencies: ['fastify-mosaic']
});
