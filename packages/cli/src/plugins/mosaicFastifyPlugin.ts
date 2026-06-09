import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import MosaicCore from '@jpmorganchase/mosaic-core';
import { MosaicConfig, IUnionVolume } from '@jpmorganchase/mosaic-types';
import path from 'node:path';
import fs from 'node:fs';

import { resolveRawSourcePath } from './resolveRawSourcePath.js';

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

/**
 * URL prefix for the raw-source route. The leading underscore
 * and double-segment shape keep it from ever colliding with a
 * real content URL (Mosaic content lives under namespace
 * prefixes that source plugins control; no source can register
 * a prefix starting with `_mosaic-`).
 */
const RAW_ROUTE_PREFIX = '/_mosaic-raw';

async function fastifyMosaic(fastify: FastifyInstance, options: FastifyMosaicPluginOptions) {
  const { config, scope, mosaic } = options;
  const fs$ = Array.isArray(scope) ? mosaic.filesystem.scope(scope) : mosaic.filesystem;
  fastify.decorate('mosaic', { config, core: mosaic, fs: fs$ });

  /**
   * Raw on-disk source fetch.
   *
   * Returns the bytes of a page **as they exist on the source
   * filesystem**, before any Mosaic plugin has touched them. The
   * in-browser editor calls this to populate its Frontmatter
   * tab with the author-authored frontmatter rather than the
   * post-plugin enriched view that the general `/*` route
   * serves.
   *
   * Status codes:
   *   - 200: raw bytes returned; `Content-Type` set from
   *     extension to match the general route's convention so
   *     fetchers can reuse the same parsing logic.
   *   - 404 with `X-Mosaic-Raw-Status: no-matching-source`:
   *     no configured source claims this URL. The editor can
   *     surface "page is virtual / synthesised".
   *   - 404 with `X-Mosaic-Raw-Status: unsupported-source`
   *     and `X-Mosaic-Raw-Module: <modulePath>`:
   *     the URL is owned by a source kind this route doesn't
   *     yet read raw bytes from (git-repo, http, figma, …).
   *     Lets the editor render a precise "frontmatter editing
   *     requires a local-folder source" hint rather than a
   *     generic failure.
   *   - 404 plain: file is owned by a supported source but
   *     doesn't exist on disk (mid-rename, deleted, race with
   *     `fs.watch`). Editor should retry on next mount.
   *   - 500: read failed for an unexpected reason; logged on
   *     the server.
   *
   * Registered *before* the catch-all `/*` so Fastify's
   * route-matching prefers it for matching URLs.
   */
  fastify.get(`${RAW_ROUTE_PREFIX}/*`, async (req: FastifyRequest, reply: FastifyReply) => {
    // Strip the route prefix to get the page URL the editor
    // intended. The wildcard parameter gives us the URL without
    // the prefix already, but we round-trip through `req.url`
    // to keep encoded characters (spaces in filenames, etc.)
    // intact — Fastify's params decoder mangles `%20` to ` `,
    // which then breaks the disk read.
    const pageUrl = req.url.slice(RAW_ROUTE_PREFIX.length) || '/';

    const resolution = resolveRawSourcePath(pageUrl, config.sources);

    if (resolution.kind === 'no-matching-source') {
      reply.header('X-Mosaic-Raw-Status', 'no-matching-source');
      reply.status(404).send();
      return;
    }

    if (resolution.kind === 'unsupported-source') {
      reply.header('X-Mosaic-Raw-Status', 'unsupported-source');
      reply.header('X-Mosaic-Raw-Module', resolution.modulePath);
      reply.status(404).send();
      return;
    }

    try {
      const stat = await fs.promises.stat(resolution.filePath);
      if (!stat.isFile()) {
        reply.header('X-Mosaic-Raw-Status', 'not-a-file');
        reply.status(404).send();
        return;
      }
      // Match the general route's Content-Type vocabulary so
      // clients can switch transparently between the two
      // endpoints.
      const ext = path.extname(resolution.filePath);
      if (ext === '.mdx') reply.header('Content-Type', 'text/mdx');
      else if (ext === '.json') reply.header('Content-Type', 'application/json');
      else if (ext === '.xml') reply.header('Content-Type', 'application/xml');
      // Echo the resolved namespace so a future debug panel
      // can show "this raw file came from source X".
      reply.header('X-Mosaic-Raw-Namespace', resolution.namespace);
      const bytes = await fs.promises.readFile(resolution.filePath);
      reply.send(bytes);
    } catch (e: unknown) {
      // ENOENT is expected during writes/renames; surface as
      // 404 rather than 500 so the client can retry without a
      // noisy stack trace.
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
        reply.status(404).send();
        return;
      }
      console.error('[Mosaic][raw]', e);
      reply.status(500).send();
    }
  });

  /**
   * General content fetch
   */
  fastify.get('/*', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (await fs$.promises.exists(req.url)) {
        if ((await fs$.promises.stat(req.url)).isDirectory()) {
          if (await fs$.promises.exists(path.join(req.url, 'index'))) {
            // Don't do an actual redirect - just send the URL as the response
            reply.header('Content-Type', 'application/json');
            reply.status(302).send({ redirect: path.posix.join(req.url, 'index') });
          } else {
            reply.status(404);
          }
        } else {
          const pagePath = String(await fs$.promises.realpath(req.url));
          if (path.extname(pagePath) === '.mdx') {
            reply.header('Content-Type', 'text/mdx');
          } else if (path.extname(pagePath) === '.json') {
            reply.header('Content-Type', 'application/json');
          } else if (path.extname(pagePath) === '.xml') {
            reply.header('Content-Type', 'application/xml');
          }
          const result = await fs$.promises.readFile(req.url);
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
  fastify: '5.x',
  name: 'fastify-mosaic'
});
