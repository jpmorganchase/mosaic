import glob from 'fast-glob';
import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import publicImageResolverPlugin from './publicImageResolver.js';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

const buildEndPlugin = () => ({
  name: 'on-end',
  setup(build) {
    build.onEnd(({ errors = [] }) => {
      if (errors.length) {
        console.error(`🛠️  - failed for: ${packageName} ❌`, errors);
      } else if (watchEnabled) {
        console.log(`🛠️ - succeeded for: ${packageName} ✅,  👀 for changes...`);
      } else {
        console.log(`🛠️ - succeeded for: ${packageName} ✅`);
      }
    });
  }
});

const entries = glob.sync(['src/index.ts', 'src/baseline/index.ts', 'src/salt/index.ts'], {
  dot: true
});

const esbuildConfig = {
  entryPoints: entries,
  loader: {
    '.jpg': 'dataurl',
    '.png': 'dataurl',
    '.svg': 'text'
  },
  outdir: './dist',
  bundle: true,
  sourcemap: true,
  splitting: true,
  minify: true,
  format: 'esm',
  target: ['es2022'],
  plugins: [
    nodeExternalsPlugin(),
    vanillaExtractPlugin({}),
    buildEndPlugin(),
    publicImageResolverPlugin
  ],
  external: ['react', 'react-dom', 'next/*', '@jpmorganchase/mosaic-*']
};

try {
  if (watchEnabled) {
    const context = await esbuild.context(esbuildConfig);
    await context.watch();
  } else {
    await esbuild.build(esbuildConfig);
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
