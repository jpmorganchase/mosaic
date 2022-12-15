#!/usr/bin/env node

const { program } = require('commander');
const build = require('./build');
const path = require('path');

program
  .option('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory', '.tmp/.mosaic-build')
  .option('-s, --scope <strings>', 'Command separated namespaces')
  .option('-p, --port <number>', 'Port to serve on', 8080)
  .option('-n, --name <string>', 'Snapshot name')
  .option('-S, --snapshot <string>', 'Snapshot path');

program.parse();

const options = program.opts();

if (program.args[0] === 'build') {
  if (options.config !== undefined) {
    const config = require(path.resolve(process.cwd(), options.config));
    if (!config) {
      throw new Error(
        `Could not find config file at ${path.resolve(process.cwd(), options.config)}.`
      );
    }
    build(config, path.resolve(process.cwd(), options.out), options);
  }
}
