const esbuild = require('esbuild');
const glob = require('fast-glob');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
const { vanillaExtractPlugin } = require('@vanilla-extract/esbuild-plugin');

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

const watchConfig = watchEnabled
  ? {
      onRebuild(error, result) {
        if (error) console.error(`watch build failed for ${packageName}:`, error);
        else console.log(`watch build succeeded for ${packageName}:`, result);
      }
    }
  : false;

esbuild
  .build({
    entryPoints: glob.sync(['src/**/*.ts?(x)', 'src/*.ts?(x)'], {
      ignore: ['**/__tests__', 'src/labs']
    }),
    loader: {
      '.jpg': 'dataurl',
      '.png': 'dataurl',
      '.svg': 'text'
    },
    outdir: './dist',
    bundle: true,
    sourcemap: false,
    splitting: true,
    minify: true,
    format: 'esm',
    target: ['es2022'],
    plugins: [nodeExternalsPlugin(), vanillaExtractPlugin({})],
    external: [
      'react',
      'react-dom',
      'next/*',
      '@jpmorganchase/mosaic-components',
      '@jpmorganchase/mosaic-open-api-component',
      '@jpmorganchase/mosaic-content-editor-plugin',
      '@jpmorganchase/mosaic-site-components',
      '@jpmorganchase/mosaic-layouts',
      '@jpmorganchase/mosaic-store',
      '@jpmorganchase/mosaic-theme'
    ],
    watch: watchConfig
  })
  .catch(e => {
    if (e.errors && e.errors.length > 0) {
      console.group(`!!!!!!! ${packageName} build errors !!!!!!!`);
      console.error(e.errors);
      console.groupEnd();
    }

    if (e.warnings && e.warnings.length > 0) {
      console.group(`!!!!!!! ${packageName} build warnings !!!!!!!`);
      console.error(e.warnings);
      console.groupEnd();
    }
    return process.exit(1);
  });
