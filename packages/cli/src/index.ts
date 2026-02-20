#!/usr/bin/env node
import { program } from 'commander';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import serve from './serve.js';
import uploadS3Snapshot from './upload-s3-snapshot.js';

import build from './build.js';

program
  .option('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory', '.tmp/.mosaic-build')
  .option('-s, --scope <strings>', 'Command separated namespaces')
  .option('-p, --port <number>', 'Port to serve on', '8080')
  .option('-n, --name <string>', 'Snapshot name')
  .option('-S, --snapshot <string>', 'Snapshot path');

program.parse();

const options = program.opts();

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

if (program.args[0] === 'build') {
  build(config.default, path.resolve(process.cwd(), options.out), options);
}
if (program.args[0] === 'serve') {
  serve(config.default, options.port, options.scope && options.scope.split(','));
}
if (program.args[0] === 'upload') {
  uploadS3Snapshot(path.resolve(process.cwd(), options.snapshot));
}
