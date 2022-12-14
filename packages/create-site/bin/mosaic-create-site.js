#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { program } = require('commander');

const pkg = require('@jpmorganchase/mosaic-create-site/package.json');

/**
 * Resolve relative paths relative to the directory where the command was invoked
 * @param filePath
 * @returns {string|*}
 */
function normalizeRelativePath(filePath) {
  if (filePath && /^[^\\/]/.test(filePath)) {
    return path.resolve(path.join(process.cwd(), filePath));
  }
  return filePath;
}

async function init({ silent = false } = {}) {
  const { default: initMosaicApp } = await import(
    '@jpmorganchase/mosaic-create-site/dist/init.mjs'
  );
  return initMosaicApp().then(() => {
    if (silent) {
      return;
    }
    console.log('Created `mosaic.generators.js`.');
    console.log(
      '1. Edit your `mosaic.generators.js`, if you want to configure your site`s components, layouts or theme'
    );
    console.log(
      '2. Run `yarn mosaic-create-site create -i` to generate your Mosaic site (use -f to overwrite existing files)'
    );
  });
}

async function readMosaicConfig(mosaicConfigPath) {
  let mosaicConfig;
  const defaultMosaicConfigPath = normalizeRelativePath('./mosaic.generators.js');
  if (!mosaicConfigPath && !fs.existsSync(defaultMosaicConfigPath)) {
    await init({ silent: true });
  }
  try {
    mosaicConfig = await require(normalizeRelativePath(
      mosaicConfigPath || defaultMosaicConfigPath
    ));
  } catch (error) {
    program.error(
      `Cannot load mosaic config ${mosaicConfigPath}, check the path\n${error.message}`
    );
  }
  return mosaicConfig;
}

program
  .name('mosaic')
  .description('CLI to generate a Mosaic site')
  .version(pkg.version)
  .showHelpAfterError();

program
  .command('init')
  .description('Initialise creation of `mosaic.generators.js`')
  .action(async () => {
    await init();
  });

program
  .command('create')
  .description('Configure a Mosaic site from `mosaic.generators.js`')
  .option(
    '-c, --config <config path>',
    'path to mosaic.generators.js, if un-specified, one will be generated'
  )
  .option('-g, --generator <generator name>', 'name of generator to run (if not interactive)')
  .option('-i, --interactive', 'interactive mode')
  .option('-o, --output <output path>', 'path to directory where site is generated', './site')
  .option('-f, --force', 'flag to force overwrite of existing content')
  .action(async options => {
    const outputPath = normalizeRelativePath(options.output);

    const mosaicConfig = await readMosaicConfig(options.config);

    const { generators } = mosaicConfig;

    const env = {
      generators,
      defaultGenerator: options.generator || 'mosaic',
      force: options.force || false,
      interactive: options.interactive || false,
      outputPath
    };

    if (!env.force && fs.existsSync(env.outputPath)) {
      program.error(
        `Output path ${env.outputPath} already exist and force flag (-f) is not set\nTo overwrite the content of this directory, re-run with the force flag`
      );
    }

    const { default: createMosaicApp } = await import(
      '@jpmorganchase/mosaic-create-site/dist/create.mjs'
    );
    createMosaicApp(env);
  });

program.parse(process.argv);
