const express = require('express');
const cors = require('cors');
const { default: PullDocs } = require('@jpmorganchase/mosaic-core');
const path = require('path');

const app = express();

module.exports = async (targetDir, port, scope) => {
  app.listen(port, () => {
    console.log(
      `Serving ${targetDir} on port ${port}${
        Array.isArray(scope) ? ` (scoped to ${scope.join(', ')})` : ''
      }`
    );
  });

  const fs = require('fs');

  app.use(cors());
  app.get('/**', async (req, res) => {
    const fullPath = path.posix.join(targetDir, req.path);
    try {
      fs.stat(fullPath, (err, stats) => {
        if (err) {
          res.status(404).end();
        }
        if (stats != undefined) {
          if (stats.isDirectory()) {
            fs.stat(path.join(fullPath, 'index'), (err, _stats) => {
              if (err) {
                res.status(404).end();
              }
              res.status(302).json({ redirect: path.join(req.path, 'index') });
            });
          } else {
            fs.realpath(fullPath, (err, pagePath) => {
              if (err) {
                res.status(404).end();
              }

              fs.readFile(pagePath, (err, data) => {
                if (err) {
                  res.status(404).end();
                }
                if (path.extname(pagePath) === '.mdx') {
                  res.contentType('text/mdx');
                } else if (path.extname(pagePath) === '.json') {
                  res.contentType('application/json');
                } else if (path.extname(pagePath) === '.xml') {
                  res.contentType('application/xml');
                }
                res.send(data);
              });
            });
          }
        } else {
          res.status(404).end();
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });
};
