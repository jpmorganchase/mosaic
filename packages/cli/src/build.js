const { default: PullDocs } = require('@pull-docs/core');
const path = require('path');
const fsExtra = require('fs-extra');
const fs = require('fs');

module.exports = async (config, outDir) => {
  const pullDocs = new PullDocs(config);
  await pullDocs.start();
  const targetDir = path.join(outDir, '.out');
  await fsExtra.emptyDir(targetDir);

  const dotDirRegExp = /(^\.)|\/\./;

  let calls = 0;
  pullDocs.onSourceUpdate(async (value, source) => {
    if (++calls === config.sources.length) {
      const symlinks = pullDocs.filesystem.symlinksToJSON();
      const files = pullDocs.filesystem.toJSON();
      for (const route in files) {
        // Skip files or DIRs starting with a .
        if (dotDirRegExp.test(route)) {
          continue;
        }
        await fsExtra.ensureFile(path.join(targetDir, route));
        await fs.promises.writeFile(path.join(targetDir, route), files[route]);
      }
      for (const alias in symlinks) {
        // Skip files or DIRs starting with a .
        if (dotDirRegExp.test(alias)) {
          continue;
        }
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
