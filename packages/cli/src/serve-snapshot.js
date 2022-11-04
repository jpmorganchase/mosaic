const express = require('express');
const cors = require('cors');
// const { default: PullDocs } = require('@jpmorganchase/mosaic-core');
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
          console.error(`[PULLDOCS] snapshot for ${fullPath} not found... sending 404..\n`, err);
          res.status(404).end();
          return;
        }
        if (stats != undefined) {
          if (stats.isDirectory()) {
            fs.stat(path.join(fullPath, 'index'), (err, _stats) => {
              if (err) {
                console.error(
                  `[PULLDOCS] No index found in snapshot directory ${fullPath} ... sending 404 ...\n`,
                  err
                );
                res.status(404).end();
                return;
              }
              console.info(`[PULLDOCS] sending redirect to for snapshot ${fullPath} ... \n`);
              res.status(302).json({ redirect: path.join(req.path, 'index') });
            });
          } else {
            fs.realpath(fullPath, (err, pagePath) => {
              if (err) {
                console.error(
                  `[PULLDOCS] snapshot not found for ${fullPath} ... sending 404 ...\n`,
                  err
                );
                res.status(404).end();
                return;
              }
              fs.readFile(pagePath, (err, data) => {
                if (err) {
                  console.error(
                    `[PULLDOCS] unable to read file for ${fullPath} / ${pagePath} ... sending 404 ...\n`,
                    err
                  );
                  res.status(404).end();
                  return;
                }
                if (path.extname(pagePath) === '.mdx') {
                  res.contentType('text/mdx');
                } else if (path.extname(pagePath) === '.json') {
                  res.contentType('application/json');
                } else if (path.extname(pagePath) === '.xml') {
                  res.contentType('application/xml');
                }
                console.info(`[PULLDOCS] sending data for ${fullPath} / ${pagePath} ... `);
                res.send(data);
              });
            });
          }
        } else {
          console.error(
            `[PULLDOCS] cannot fs.stat anything in snapshot for ${fullPath} ... sending 404..\n`,
            err
          );
          res.status(404).end();
        }
      });
    } catch (e) {
      console.error(`[PULLDOCS] `, e);
      res.status(500).end();
    }
  });
};
