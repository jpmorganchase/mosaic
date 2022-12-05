const esbuild = require('esbuild');

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
    entryPoints: ['src/index.js'],
    bundle: true,
    loader: {
      '.png': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
      '.eot': 'dataurl',
      '.ttf': 'dataurl',
      '.svg': 'dataurl'
    },
    outdir: './dist',
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
    return process.exit(1);
  });
