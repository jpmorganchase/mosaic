import { FastifyInstance, FastifyRequest } from 'fastify';
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
    async (req: FastifyRequest<{ Body: WorkflowRequestBodyType }>, reply) => {
      try {
        const { user, route: routeReq, markdown, name } = req.body;

        if (!name) {
          throw new Error('Workflow name is required');
        }

        if (await fs.promises.exists(routeReq)) {
          const route = (await fs.promises.stat(routeReq)).isDirectory()
            ? path.posix.join(routeReq, 'index')
            : routeReq;
          const pagePath = (await fs.promises.realpath(route)) as string;
          const result = await core.triggerWorkflow(name, pagePath, { user, markdown });
          reply.header('Content-Type', 'application/json');
          reply.send(result);
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
