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

/**
 * Invoke a subcommand fire-and-forget, routing any rejection into a
 * fatal error log + non-zero exit. We deliberately do NOT `await`:
 * `serve` resolves once Fastify is bound and keeps the event loop
 * alive via its listening socket, so `await serve(...)` would either
 * be a no-op (success) or, if any boot step hangs, turn into Node's
 * "unsettled top-level await" (exit 13) with no diagnostic. The
 * explicit `.catch` gives us failure visibility without coupling
 * process exit to the listening socket's lifetime.
 */
function dispatch(promise: Promise<unknown>) {
  promise.catch(err => {
    console.error('[Mosaic][CLI]', err);
    process.exit(1);
  });
}

if (program.args[0] === 'build') {
  dispatch(build(config.default, path.resolve(process.cwd(), options.out), options));
}
if (program.args[0] === 'serve') {
  dispatch(serve(config.default, options.port, options.scope && options.scope.split(',')));
}
if (program.args[0] === 'upload') {
  dispatch(uploadS3Snapshot(path.resolve(process.cwd(), options.snapshot)));
}
