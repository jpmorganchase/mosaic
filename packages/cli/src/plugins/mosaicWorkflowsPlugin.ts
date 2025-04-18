import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';
import md5 from 'md5';
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
  fastify.get('/workflows', { websocket: true }, (socket /* SocketStream */) => {
    socket.on('message', async message => {
      if (socket.OPEN) {
        try {
          const {
            type,
            route: routeReq,
            name,
            user,
            ...restParams
          } = JSON.parse(message.toString());

          if (!name) {
            socket.send(JSON.stringify({ status: 'ERROR', message: 'Workflow name is required' }));
          }

          if (!user) {
            socket.send(
              JSON.stringify({ status: 'ERROR', message: 'Workflow must be run for a user' })
            );
          }

          const userId = user.id || user.sid;
          const channel = md5(`${userId.toLowerCase()} - ${name.toLowerCase()}`);

          const sendWorkflowProgressMessage: SendSourceWorkflowMessage = (info, status) =>
            socket.send(JSON.stringify({ status, message: info, channel }));

          if (await fs.promises.exists(routeReq)) {
            const route = (await fs.promises.stat(routeReq)).isDirectory()
              ? path.posix.join(routeReq, 'index')
              : routeReq;
            const pagePath = (await fs.promises.realpath(route)) as string;
            core.triggerWorkflow(sendWorkflowProgressMessage, name, pagePath, {
              user,
              ...restParams
            });
            sendWorkflowProgressMessage(`Workflow ${name} has started`, 'SUCCESS');
          } else {
            sendWorkflowProgressMessage(`${routeReq} not found`, 'ERROR');
          }
        } catch (e) {
          console.error(e);
          socket.send(JSON.stringify({ status: 'ERROR', message: e.message }));
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
  fastify: '5.x',
  name: 'fastify-mosaic-workflows',
  dependencies: ['fastify-mosaic']
});
