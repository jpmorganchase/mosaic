import esbuild from 'esbuild';
import glob from 'fast-glob';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

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
    outdir: './dist',
    outExtension: { '.js': '.mjs' },
    bundle: true,
    sourcemap: false,
    splitting: true,
    minify: true,
    format: 'esm',
    target: ['es2022', 'node18'],
    platform: 'node',
    plugins: [nodeExternalsPlugin()],
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
