import Fastify, { type FastifyRequest } from 'fastify';
import cors from 'cors';
import path from 'node:path';
import MosaicCore from '@jpmorganchase/mosaic-core';
import { MosaicConfig, SourceModuleDefinition } from '@jpmorganchase/mosaic-types';
import middie from '@fastify/middie';

const MOSAIC_ADMIN_PREFIX = '_mosaic_';

interface AdminRequestBodyType {
  name: string;
}

interface AddSourceRequestBodyType {
  definition: SourceModuleDefinition;
  isPreview?: boolean;
}

interface WorkflowRequestBodyType {
  user: string;
  route: string;
  markdown: string;
  name: string;
}

export default async function serve(config: MosaicConfig, port: number, scope?: string[]) {
  /**
   * Start up Mosaic instance
   */
  const mosaic = new MosaicCore(config);
  await mosaic.start();
  const fs = Array.isArray(scope) ? mosaic.filesystem.scope(scope) : mosaic.filesystem;

  const server = Fastify({
    logger: false
  });

  await server.register(middie);
  server.use(cors());

  /**
   * List the sources that Mosaic has been configured to use.
   * Will provide the generated name of each source
   * which can be used to stop/restart the source
   */
  server.get(`/${MOSAIC_ADMIN_PREFIX}/sources/list`, async (_req, reply) => {
    reply.header('Content-Type', 'application/json');
    const sources = await mosaic.listSources();

    const response = sources.map(source => {
      const sourceFromConfig = config.sources[source.index];
      const options = sourceFromConfig.options as { credentials?: string } | undefined;

      if (
        options?.credentials &&
        sourceFromConfig.modulePath === '@jpmorganchase/mosaic-source-git-repo'
      ) {
        const parts = options.credentials?.split(':') || [];
        if (parts.length > 0) {
          sourceFromConfig.options = {
            ...options,
            credentials: `${parts[0]}: ********`
          };
        }
      }

      return {
        name: source.name,
        ...sourceFromConfig,
        pluginErrors: source.pluginErrors
      };
    });
    reply.send(response);
  });

  /**
   * Return the JSON config that Mosaic was started with
   */
  server.get(`/${MOSAIC_ADMIN_PREFIX}/config`, async (_req, reply) => {
    reply.header('Content-Type', 'application/json');
    reply.send(config);
  });

  /**
   * Return the filesystem as JSON
   */
  server.get(`/${MOSAIC_ADMIN_PREFIX}/content/dump`, async (_req, reply) => {
    reply.header('Content-Type', 'application/json');
    reply.send(fs.toJSON());
  });

  /**
   * Stop a running source using it's generated name
   */
  server.put(
    `/${MOSAIC_ADMIN_PREFIX}/source/stop`,
    async (req: FastifyRequest<{ Body: AdminRequestBodyType }>, reply) => {
      reply.header('Content-Type', 'application/text');
      const { name } = req.body;
      if (name) {
        try {
          await mosaic.stopSource(String(name));
          reply.send(`${name} stopped successfully.`);
        } catch (e) {
          console.error(e);
          reply.status(500).send(`${name} not stopped.  Check you have the right name!`);
        }
      }
    }
  );

  /**
   * Restart a running source using it's generated name
   */
  server.put(
    `/${MOSAIC_ADMIN_PREFIX}/source/restart`,
    async (req: FastifyRequest<{ Body: AdminRequestBodyType }>, reply) => {
      reply.header('Content-Type', 'application/text');
      const { name } = req.body;
      if (name) {
        try {
          await mosaic.restartSource(String(name));
          reply.send(`${name} restarted successfully.`);
        } catch (e) {
          console.error(e);
          reply.status(500).send(`${name} not restarted.  Check you have the right name!`);
        }
      }
    }
  );

  /**
   * General content fetch
   */
  server.get('/*', async (req, reply) => {
    try {
      if (await fs.promises.exists(req.url)) {
        if ((await fs.promises.stat(req.url)).isDirectory()) {
          if (await fs.promises.exists(path.join(req.url, 'index'))) {
            // Don't do an actual redirect - just send the URL as the response
            reply.header('Content-Type', 'application/json');
            reply.status(302).send({ redirect: path.join(req.url, 'index') });
          } else {
            reply.status(404);
          }
        } else {
          const pagePath = await fs.promises.realpath(req.url);
          if (path.extname(pagePath) === '.mdx') {
            reply.header('Content-Type', 'text/mdx');
          } else if (path.extname(pagePath) === '.json') {
            reply.header('Content-Type', 'application/json');
          } else if (path.extname(pagePath) === '.xml') {
            reply.header('Content-Type', 'application/xml');
          }
          const result = await fs.promises.readFile(req.url);
          reply.send(result);
        }
      } else {
        reply.status(404);
      }
    } catch (e) {
      console.error(e);
      reply.status(500);
    }
  });

  /**
   * Run a workflow
   */
  server.post(
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
          const pagePath = await fs.promises.realpath(route);
          const result = await mosaic.triggerWorkflow(name, pagePath, { user, markdown });
          reply.header('Content-Type', 'application/json');
          reply.send(result);
        }
      } catch (e) {
        console.error(e);
        reply.status(500).send(e.message);
      }
    }
  );

  /**
   * Add a new source
   */
  server.post(
    `/${MOSAIC_ADMIN_PREFIX}/source/add`,
    async (req: FastifyRequest<{ Body: AddSourceRequestBodyType }>, reply) => {
      try {
        const { definition, isPreview = true } = req.body;

        if (process.env.MOSAIC_ENABLE_SOURCE_PUSH !== 'true') {
          throw new Error('Source push is disabled.');
        }

        if (!definition) {
          throw new Error('Source definition is required');
        }

        if (isPreview) {
          const namespace = `preview-${definition.namespace}`;
          definition.namespace = namespace;
        }

        const source = await mosaic.addSource(definition);
        reply.send(
          source !== undefined
            ? `Source ${source.id.description} added successfully`
            : 'Unable to add source'
        );
      } catch (e) {
        console.error(e);
        reply.status(500).send(e.message);
      }
    }
  );

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
  start();
}
