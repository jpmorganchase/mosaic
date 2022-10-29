const express = require('express');
const cors = require('cors');
const { default: PullDocs } = require('@jpmorganchase/mosaic-core');
const path = require('path');

const app = express();

module.exports = async (config, port, scope) => {
  app.listen(port, () => {
    console.log(
      `[PullDocs] Listening on port ${port}${
        Array.isArray(scope) ? ` (scoped to ${scope.join(', ')})` : ''
      }`
    );
  });
  const pullDocs = new PullDocs(config);
  await pullDocs.start();

  const fs = Array.isArray(scope) ? pullDocs.filesystem.scope(scope) : pullDocs.filesystem;

  app.use(cors());

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
};
