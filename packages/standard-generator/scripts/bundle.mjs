import fs from 'fs-extra';
import esbuild from 'esbuild';

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

try {
  const context = await esbuild.context({
    entryPoints: ['src/fs.config.js', 'src/generator.config.js', 'src/generator.js'],
    bundle: false,
    outdir: 'dist',
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'on-end',
        setup(build) {
          build.onEnd(({ errors = [] }) => {
            if (errors.length) {
              console.error(`build failed for ${packageName}:`, errors);
            } else {
              console.log(`build succeeded for ${packageName}:`);
              fs.copySync('./src/templates', './dist/templates', { overwrite: true });
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
