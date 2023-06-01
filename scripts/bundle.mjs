import esbuild from 'esbuild';
import glob from 'fast-glob';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

try {
  const context = await esbuild.context({
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
    splitting: false,
    minify: true,
    format: 'esm',
    target: ['es2022'],
    plugins: [
      nodeExternalsPlugin(),
      vanillaExtractPlugin({}),
      {
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
      }
    ],
    external: [
      'react',
      'react-dom',
      'next/*',
      '@jpmorganchase/mosaic-components',
      '@jpmorganchase/mosaic-components-lab',
      '@jpmorganchase/mosaic-open-api-component',
      '@jpmorganchase/mosaic-content-editor-plugin',
      '@jpmorganchase/mosaic-site-components',
      '@jpmorganchase/mosaic-layouts',
      '@jpmorganchase/mosaic-store'
    ]
  });
  const result = await context.rebuild();
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
