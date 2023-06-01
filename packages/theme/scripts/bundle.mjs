import path from 'path';
import glob from 'fast-glob';
import esbuild from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import publicImageResolverPlugin from './publicImageResolver.js';
import saltIconNamesPlugin from './saltIconNames.js';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

const onEndPlugin = {
  name: 'on-end',
  setup(build) {
    build.onEnd(({ errors = [] }) => {
      if (errors.length) {
        console.error(`build failed for ${packageName}:`, errors);
      } else {
        console.log(`build succeeded for ${packageName}:`);
      }
    });
  }
};

try {
  const context = await esbuild.context({
    entryPoints: glob.sync([
      '../../node_modules/@salt-ds/icons/dist-es/packages/icons/src/components/*.js'
    ]),
    bundle: false,
    outdir: 'dist',
    plugins: [saltIconNamesPlugin, onEndPlugin]
  });
  await context.rebuild();
  if (watchEnabled) {
    await context.watch();
  }
  await context.serve();
  context.dispose();
} catch (e) {
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
}

try {
  const entries = glob.sync(['src/index.ts', 'src/**/index.ts'], {
    dot: true
  });
  const context = await esbuild.context({
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
    plugins: [publicImageResolverPlugin, vanillaExtractPlugin(), onEndPlugin]
  });
  await context.rebuild();
  if (watchEnabled) {
    await context.watch();
  }
  await context.serve();
  context.dispose();
} catch (e) {
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
}
