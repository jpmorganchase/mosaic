#!/usr/bin/env node

const { program } = require('commander');
const serve = require('./serve');
const serveSnapshot = require('./serve-snapshot');
const build = require('./build');
const path = require('path');

program
  .option('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory', '.tmp/.mosaic-build')
  .option('-s, --scope <strings>', 'Command separated namespaces')
  .option('-p, --port <number>', 'Port to serve on', 8080);

program.parse();

const options = program.opts();

if (program.args[0] === 'serve-snapshot') {
  const targetDir = path.resolve(process.cwd(), program.args[1]);
  serveSnapshot(targetDir, options.port, options.scope && options.scope.split(','));
} else {
  const config = require(path.resolve(process.cwd(), options.config));
  if (!config) {
    throw new Error(
      `Could not find config file at ${path.resolve(process.cwd(), options.config)}.`
    );
  } else if (program.args[0] === 'build') {
    build(
      config,
      path.resolve(process.cwd(), options.out),
      options.scope && options.scope.split(',')
    );
  } else if (program.args[0] === 'serve') {
    serve(config, options.port, options.scope && options.scope.split(','));
  }
}
