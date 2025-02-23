import fs from 'fs';
import esbuild from 'esbuild';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

try {
  const context = await esbuild.context({
    entryPoints: ['src/fs.config.js', 'src/generator.config.js', 'src/generator.js'],
    bundle: false,
    outdir: 'dist',
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'copy-additional-files',
        setup(build) {
          build.onEnd(() => {
            fs.cpSync('./src/templates', './dist/templates', { force: true, recursive: true });
          });
        }
      }
    ]
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
