import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SourceModuleDefinition } from '@jpmorganchase/mosaic-types';
import fp from 'fastify-plugin';

export interface FastifyMosaicAdminPluginOptions {
  prefix: string;
  enableSourcePush?: boolean;
}

export interface AdminRequestBodyType {
  name: string;
}

interface AddSourceRequestBodyType {
  definition: SourceModuleDefinition;
  isPreview?: boolean;
}

function mosaicAdmin(fastify: FastifyInstance, options: FastifyMosaicAdminPluginOptions, next) {
  const { prefix } = options;
  const { config, fs, core } = fastify.mosaic;

  /**
   * Return the JSON config that Mosaic was started with.
   * Credentials for git sources are sanitized.
   */
  fastify.get(`/${prefix}/config`, async (_req, reply: FastifyReply) => {
    reply.header('Content-Type', 'application/json');

    const sourcesWithoutCredentials = config.sources.map(source => {
      const sourceOptions = source?.options as { credentials?: string };
      const credentials = sourceOptions?.credentials as string;

      if (credentials && source.modulePath === '@jpmorganchase/mosaic-source-git-repo') {
        const parts = credentials.split(':') || [];
        if (parts.length > 0) {
          source.options = { ...sourceOptions, credentials: `${parts[0]}: ********` };
        }
      }

      return source;
    });
    const sanitizedConfig = { ...config, sources: sourcesWithoutCredentials };
    reply.send(sanitizedConfig);
  });

  /**
   * Return the filesystem as JSON
   */
  fastify.get(`/${prefix}/content/dump`, (_req, reply: FastifyReply) => {
    reply.header('Content-Type', 'application/json');
    reply.send(fs.toJSON());
  });

  /**
   * List the sources that Mosaic has been configured to use.
   * Will provide the generated name of each source
   * which can be used to stop/restart the source
   */
  fastify.get(`/${prefix}/sources/list`, async (_req, reply: FastifyReply) => {
    reply.header('Content-Type', 'application/json');
    const sources = await core.listSources();

    const response = sources.map(source => {
      const sourceFromConfig = config.sources[source.index];
      const sourceOptions = sourceFromConfig?.options as { credentials?: string } | undefined;

      if (
        sourceOptions?.credentials &&
        sourceFromConfig.modulePath === '@jpmorganchase/mosaic-source-git-repo'
      ) {
        const parts = sourceOptions.credentials?.split(':') || [];
        if (parts.length > 0) {
          sourceFromConfig.options = {
            ...sourceOptions,
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
   * Stop a running source using it's generated name
   */
  fastify.put(
    `/${prefix}/source/stop`,
    async (req: FastifyRequest<{ Body: AdminRequestBodyType }>, reply: FastifyReply) => {
      reply.header('Content-Type', 'application/text');
      const { name } = req.body;

      if (name) {
        try {
          await core.stopSource(String(name));
          reply.send(`${name} stopped successfully.`);
        } catch (e) {
          console.error(e);
          reply.status(500).send(`${name} not stopped.  Check you have the right name!`);
        }
      } else {
        reply.status(500).send('No source name provided.');
      }
    }
  );

  /**
   * Restart a running source using it's generated name
   */
  fastify.put(
    `/${prefix}/source/restart`,
    async (req: FastifyRequest<{ Body: AdminRequestBodyType }>, reply: FastifyReply) => {
      reply.header('Content-Type', 'application/text');
      const { name } = req.body;
      if (name) {
        try {
          await core.restartSource(String(name));
          reply.send(`${name} restarted successfully.`);
        } catch (e) {
          console.error(e);
          reply.status(500).send(`${name} not restarted.  Check you have the right name!`);
        }
      } else {
        reply.status(500).send('No source name provided.');
      }
    }
  );

  /**
   * Add a new source
   */
  fastify.post(
    `/${prefix}/source/add`,
    async (req: FastifyRequest<{ Body: AddSourceRequestBodyType }>, reply: FastifyReply) => {
      try {
        const { definition, isPreview = true } = req.body;

        reply.header('Content-Type', 'application/text');

        if (!options.enableSourcePush) {
          throw new Error('Source push is disabled.');
        }

        if (!definition) {
          throw new Error('Source definition is required');
        }

        if (isPreview) {
          const namespace = `preview-${definition.namespace}`;
          definition.namespace = namespace;
        }

        const source = await core.addSource(definition);
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

  next();
}

/**
 * Fastify plugin that adds support for the Mosaic Admin API routes
 * https://mosaic-mosaic-dev-team.vercel.app/mosaic/configure/admin/index
 */
export default fp(mosaicAdmin, {
  fastify: '5.x',
  name: 'fastify-mosaic-admin',
  dependencies: ['fastify-mosaic']
});
