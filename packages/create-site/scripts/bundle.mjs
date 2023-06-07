import fs from 'fs-extra';
import esbuild from 'esbuild';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

try {
  const context = await esbuild.context({
    entryPoints: ['src/create.ts', 'src/init.ts'],
    bundle: false,
    outdir: 'dist',
    outExtension: { '.js': '.mjs' },
    platform: 'node',
    format: 'esm',
    plugins: [
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
    ]
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
