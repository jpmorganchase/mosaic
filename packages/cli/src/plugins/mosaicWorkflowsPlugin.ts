import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';

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

function mosaicWorkflows(fastify: FastifyInstance, _options, next) {
  const { fs, core } = fastify.mosaic;

  /**
   * Run a workflow
   */
  fastify.post(
    '/workflows',
    async (req: FastifyRequest<{ Body: WorkflowRequestBodyType }>, reply: FastifyReply) => {
      try {
        const { route: routeReq, name, ...restParams } = req.body;

        if (!name) {
          reply.header('Content-Type', 'application/text');
          throw new Error('Workflow name is required');
        }

        if (await fs.promises.exists(routeReq)) {
          const route = (await fs.promises.stat(routeReq)).isDirectory()
            ? path.posix.join(routeReq, 'index')
            : routeReq;
          const pagePath = (await fs.promises.realpath(route)) as string;
          const result = await core.triggerWorkflow(name, pagePath, { ...restParams });
          reply.header('Content-Type', 'application/json');
          reply.send(result);
        } else {
          reply.header('Content-Type', 'application/text');
          reply.status(404).send(`${routeReq} not found`);
        }
      } catch (e) {
        console.error(e);
        reply.status(500).send(e.message);
      }
    }
  );

  next();
}

/**
 * Fastify plugin that adds support for the Mosaic Admin API routes
 * https://mosaic-mosaic-dev-team.vercel.app/mosaic/configure/admin/index
 */
export default fp(mosaicWorkflows, {
  fastify: '4.x',
  name: 'fastify-mosaic-workflows',
  dependencies: ['fastify-mosaic']
});
