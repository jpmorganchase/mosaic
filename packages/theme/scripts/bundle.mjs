import esbuild from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import glob from 'fast-glob';

import { publicImageResolver } from './publicImageResolver.mjs';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

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
    plugins: [publicImageResolver, vanillaExtractPlugin()]
  });
  if (watchEnabled) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
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
