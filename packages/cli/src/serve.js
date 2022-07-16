const express = require('express');
const cors = require('cors');
const { default: PullDocs } = require('@pull-docs/core');

const app = express();

module.exports = async (config, port) => {

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
  const pullDocs = new PullDocs(config);
  pullDocs.start();

  pullDocs.onSourceUpdate(async (value, source) => {
    // console.log(
    //   'CHANGE',
    //   (await source.filesystem.readFile('/case-studies/index.mdx')).toString()
    // );
  });

  app.use(cors());

  app.get('/**', async (req, res) => {
    try {
      if (await pullDocs.filesystem.promises.exists(req.path)) {
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
