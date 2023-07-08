#!/usr/bin/env node
import { program } from 'commander';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import serve from './serve.js';
import uploadS3Snapshot from './upload-s3-snapshot.js';

import exportStatic from './exportStatic.js';
import serveStatic from './serveStatic.js';
import { updateTraceFile } from './vercel-snapshot.js';

program
  .option('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory', '.tmp/.mosaic-build')
  .option('-s, --scope <strings>', 'Command separated namespaces')
  .option('-p, --port <number>', 'Port to serve on', '8080')
  .option('-n, --name <string>', 'Snapshot name')
  .option('-S, --snapshot <string>', 'Snapshot path');

program.parse();

const options = program.opts();

if (program.args[0] === 'export:static') {
  exportStatic();
} else if (program.args[0] === 'serve:static') {
  serveStatic(path.resolve(process.cwd(), options.out));
} else {
  let config;
  if (options.config !== undefined) {
    config = await import(pathToFileURL(path.resolve(process.cwd(), options.config)).toString());

    if (!config) {
      throw new Error(
        `[Mosaic] could not find config file at ${path.resolve(process.cwd(), options.config)}.`
      );
    }
  } else {
    throw new Error(`[Mosaic] no config file provided`);
  }

  if (program.args[0] === 'serve') {
    serve(config.default, options.port, options.scope && options.scope.split(','));
  } else if (program.args[0] === 'upload') {
    uploadS3Snapshot(path.resolve(process.cwd(), options.snapshot));
  } else if (program.args[0] === 'deploy') {
    updateTraceFile(config.default, options);
  }
}
