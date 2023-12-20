import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import MosaicCore from '@jpmorganchase/mosaic-core';
import { MosaicConfig, IUnionVolume } from '@jpmorganchase/mosaic-types';
import path from 'node:path';

export interface FastifyMosaicPluginOptions {
  config: MosaicConfig;
  scope?: string[];
  mosaic: MosaicCore;
}

export interface FastifyMosaic {
  config: MosaicConfig;
  core: MosaicCore;
  fs: IUnionVolume;
}

async function fastifyMosaic(fastify: FastifyInstance, options: FastifyMosaicPluginOptions) {
  const { config, scope, mosaic } = options;
  const fs = Array.isArray(scope) ? mosaic.filesystem.scope(scope) : mosaic.filesystem;
  fastify.decorate('mosaic', { config, core: mosaic, fs });

  /**
   * General content fetch
   */
  fastify.get('/*', async (req: FastifyRequest, reply: FastifyReply) => {
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
          const pagePath = String(await fs.promises.realpath(req.url));
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
}

// Most importantly, use declaration merging to add the custom property to the Fastify type system
declare module 'fastify' {
  interface FastifyInstance {
    mosaic: FastifyMosaic;
  }
}

export default fp(fastifyMosaic, {
  fastify: '4.x',
  name: 'fastify-mosaic'
});
