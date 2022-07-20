const express = require('express');
const cors = require('cors');
const { default: PullDocs } = require('@pull-docs/core');
const path = require('path');

const app = express();

module.exports = async (config, port) => {

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
  const pullDocs = new PullDocs(config);
  await pullDocs.start();

  pullDocs.onSourceUpdate(async (value, source) => {
    // console.log(
    //   'CHANGE',
    //   (await source.filesystem.readFile('/case-studies/index.mdx')).toString()
    // );
  });

  app.use(cors());

  app.get('/sitemap.xml', async (req, res) => {
    res.contentType('application/xml');
    const result = String(await pullDocs.filesystem.promises.readFile(req.path));
    res.send(result);
  });
  app.get('/**', async (req, res) => {
    try {
      if (await pullDocs.filesystem.promises.exists(req.path)) {
        const pagePath = await pullDocs.filesystem.promises.realpath(req.path);
        if (path.extname(pagePath) === '.mdx') {
          res.contentType('text/mdx');
        } else if (path.extname(pagePath) === '.json') {
          res.contentType('application/json');
        }
        const result = String(await pullDocs.filesystem.promises.readFile(req.path));
        res.send(result);
      } else {
        res.status(404).end();
      }
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });
};
