#!/usr/bin/env node
import { program } from 'commander';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { InvalidEnvError } from './env.js';
import serve from './serve.js';

import build from './build.js';

program
  .option('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory', '.tmp/.mosaic-build')
  .option('-s, --scope <strings>', 'Command separated namespaces')
  .option('-p, --port <number>', 'Port to serve on', '8080')
  .option('--host <string>', 'Host or IP address to bind to', 'localhost')
  .option('-n, --name <string>', 'Snapshot name');

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

/** Route command failures to the CLI diagnostic and exit code. */
function dispatch(promise: Promise<unknown>) {
  return promise.catch(err => {
    // An invalid env already lists every problem; a stack trace adds nothing.
    console.error('[Mosaic][CLI]', err instanceof InvalidEnvError ? err.message : err);
    process.exit(1);
  });
}

if (program.args[0] === 'build') {
  await dispatch(build(config.default, path.resolve(process.cwd(), options.out), options));
}
if (program.args[0] === 'serve') {
  // Fastify's listener keeps the process alive after startup.
  dispatch(
    serve(config.default, options.port, options.scope && options.scope.split(','), options.host)
  );
}
