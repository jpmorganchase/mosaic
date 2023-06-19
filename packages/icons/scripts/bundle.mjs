import glob from 'fast-glob';
import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
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
    entryPoints: glob.sync(['../../node_modules/@salt-ds/icons/dist-es/components/*.js']),
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
  const context = await esbuild.context({
    entryPoints: glob.sync(['src/**/*.ts?(x)', 'src/*.ts?(x)'], {
      ignore: ['**/__tests__']
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
    plugins: [
      nodeExternalsPlugin(),
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
    external: ['react', 'react-dom']
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
