const { default: PullDocs } = require('@pull-docs/core');
const path = require('path');
const fsExtra = require('fs-extra');
const fs = require('fs');

module.exports = async (config, outDir) => {
  // Strip out any plugins that are meant for runtime use only (i.e. `LazyPagePlugin`)
  config.plugins = config.plugins.filter(({ runTimeOnly }) => !runTimeOnly);
  const pullDocs = new PullDocs(config);
  await pullDocs.start();
  const targetDir = path.join(outDir, '.out');
  await fsExtra.emptyDir(targetDir);

  let calls = 0;
  pullDocs.onSourceUpdate(async (value, source) => {
    if (++calls === config.sources.length) {
      const symlinks = pullDocs.filesystem.symlinksToJSON();
      const allFiles = await pullDocs.filesystem.promises.glob('/**', {
        dot: true,
        ignore: ['.tags'],
        onlyFiles: true
      });
      for (const filePath of allFiles) {
        // if (dotDirRegExp.test(filePath)) {
        //   continue;
        // }
        const rawFile = await pullDocs.filesystem.promises.readFile(String(filePath));
        await fs.promises.mkdir(path.dirname(path.join(targetDir, String(filePath))), {
          recursive: true
        });
        await fs.promises.writeFile(
          path.join(targetDir, String(filePath)),
          rawFile
        );
      }
      for (const alias in symlinks) {
        for (const { target } of symlinks[alias]) {
          await fsExtra.ensureDir(path.join(targetDir, path.dirname(alias)));
          await fs.promises.symlink(path.join(targetDir, target), path.join(targetDir, alias));
        }
      }

      console.log(`Filesystem for ${config.sources.length} sources written to disk at '${targetDir}'`);
      pullDocs.stop();
    }
  });


};
