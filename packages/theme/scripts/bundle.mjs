import esbuild from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import glob from 'fast-glob';

import { publicImageResolver } from './publicImageResolver.mjs';
import { saltIconNames } from './saltIconNames.mjs';

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

const entries = glob.sync(['src/index.ts', 'src/**/index.ts'], {
  dot: true
});

esbuild
  .build({
    entryPoints: glob.sync(['../../node_modules/@salt-ds/icons/dist-es/components/*.js']),
    bundle: false,
    outdir: 'dist',
    plugins: [saltIconNames]
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
    process.exit(1);
  });

esbuild
  .build({
    entryPoints: entries,
    loader: {
      '.jpg': 'dataurl',
      '.png': 'dataurl',
      '.svg': 'text'
    },
    outdir: 'dist',
    bundle: true,
    splitting: true,
    sourcemap: false,
    minify: true,
    format: 'esm',
    target: ['esnext'],
    external: ['react', 'react-dom'],
    plugins: [publicImageResolver, vanillaExtractPlugin()],
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
    process.exit(1);
  });
