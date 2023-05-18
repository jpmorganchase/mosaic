import express from 'express';
import cors from 'cors';
import path from 'node:path';
import MosaicCore from '@jpmorganchase/mosaic-core';

const app = express();

const addedSources = new Set<{ name: string; id: symbol }>();

export default async function serve(config, port, scope) {
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
      const { definition, name, isPreview = true } = req.body;

      if (process.env.MOSAIC_ENABLE_SOURCE_PUSH !== 'true') {
        throw new Error('Source push is disabled.');
      }

      if (!definition) {
        throw new Error('Source definition is required');
      }

      if (!name) {
        throw new Error('A name is required');
      } else {
        addedSources.forEach(addedSource => {
          if (addedSource.name === name) {
            mosaic.stopSource(addedSource.id);
          }
        });
      }

      if (isPreview) {
        const namespace = `preview-${definition.namespace}`;
        definition.namespace = namespace;
      }

      const source = await mosaic.addSource(definition);
      addedSources.add({ name, id: source.id });
      res.send(source !== undefined ? definition.namespace : 'Unable to add source');
    } catch (e) {
      console.error(e);
      res.status(500).send(e.message).end();
    }
  });
}
