import express from 'express';
import cors from 'cors';
import path from 'node:path';
import MosaicCore from '@jpmorganchase/mosaic-core';
import { MosaicConfig } from '@jpmorganchase/mosaic-types';

const app = express();

export default async function serve(config: MosaicConfig, port, scope) {
  app.listen(port, () => {
    console.log(
      `[Mosaic] Listening on port ${port}${
        Array.isArray(scope) ? ` (scoped to ${scope.join(', ')})` : ''
      }`
    );
  });
  const mosaic = new MosaicCore(config);
  await mosaic.start();

  const fs = Array.isArray(scope) ? mosaic.filesystem.scope(scope) : mosaic.filesystem;

  app.use(cors(), express.json());

  /**
   * List the sources that Mosaic has been configured to use.
   * Will provide the generated name of each source
   * which can be used to stop/restart the source
   */
  app.get('/_mosaic_/sources/list', async (_req, res) => {
    res.contentType('application/json');
    const sources = await mosaic.listSources();

    const response = sources.map(source => ({
      name: source.name,
      ...config.sources[source.index]
    }));
    res.send(response);
  });

  /**
   * Return the JSON config that Mosaic was started with
   */
  app.get('/_mosaic_/config', async (_req, res) => {
    res.contentType('application/json');
    res.send(config);
  });

  /**
   * Stop a running source using it's generated name
   */
  app.put('/_mosaic_/source/stop', async (req, res) => {
    res.contentType('application/text');
    const { name } = req.body;
    if (name) {
      try {
        await mosaic.stopSource(String(name));
        res.send(`${name} stopped successfully.`);
      } catch (e) {
        console.error(e);
        res.status(500).send(`${name} not stopped.  Check you have the right name!`).end();
      }
    }
  });

  /**
   * Restart a running source using it's generated name
   */
  app.put('/_mosaic_/source/restart', async (req, res) => {
    res.contentType('application/text');
    const { name } = req.body;
    if (name) {
      try {
        await mosaic.restartSource(String(name));
        res.send(`${name} restarted successfully.`);
      } catch (e) {
        console.error(e);
        res.status(500).send(`${name} not restarted.  Check you have the right name!`).end();
      }
    }
  });

  app.get('/**', async (req, res) => {
    try {
      if (await fs.promises.exists(req.path)) {
        if ((await fs.promises.stat(req.path)).isDirectory()) {
          if (await fs.promises.exists(path.join(req.path, 'index'))) {
            // Don't do an actual redirect - just send the URL as the response
            res.status(302).json({ redirect: path.join(req.path, 'index') });
          } else {
            res.status(404).end();
          }
        } else {
          const pagePath = await fs.promises.realpath(req.path);
          if (path.extname(pagePath) === '.mdx') {
            res.contentType('text/mdx');
          } else if (path.extname(pagePath) === '.json') {
            res.contentType('application/json');
          } else if (path.extname(pagePath) === '.xml') {
            res.contentType('application/xml');
          }
          const result = await fs.promises.readFile(req.path);
          res.send(result);
        }
      } else {
        res.status(404).end();
      }
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });

  app.post('/workflows', async (req, res) => {
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
        res.contentType('application/json');
        res.send(result);
      }
    } catch (e) {
      console.error(e);
      res.status(500).send(e.message).end();
    }
  });

  app.post('/sources/add', async (req, res) => {
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
      res.send(
        source !== undefined
          ? `Source ${source.id.description} added successfully`
          : 'Unable to add source'
      );
    } catch (e) {
      console.error(e);
      res.status(500).send(e.message).end();
    }
  });
}
