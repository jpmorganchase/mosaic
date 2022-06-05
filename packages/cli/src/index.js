#!/usr/bin/env node

const { program } = require('commander');
const serve = require("./serve");
const build = require("./build");
const path = require('path');

program
  .requiredOption('-c, --config <string>', 'Config path')
  .option('-o, --out <string>', 'Output directory')
  .option('-p, --port <number>', 'Port to serve on');

program.parse();

const options = program.opts();

const config = require(path.resolve(process.cwd(), options.config));

if (!config) {
    throw new Error(`Could not find config file at ${path.resolve(process.cwd(), options.config)}.`);
}

if (program.args[0] === 'build') {
    if (!options.out) {
        throw new Error('Out directory -o is required');
    }
    build(config, path.resolve(process.cwd(), options.out));
} else if (program.args[0] === 'serve') {
    serve(config, options.port || 3000);
}
