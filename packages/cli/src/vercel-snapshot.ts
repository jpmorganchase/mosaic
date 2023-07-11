import path from 'path';
import { globby } from 'globby';
import fsExtra from 'fs-extra';

/**
 * When deploying a mosaic site to vercel, snapshot files are ignored resulting in a 404 when a page is accessed from the site.
 *
 * Vercel uses output file tracing (https://nextjs.org/docs/advanced-features/output-file-tracing) to determine what files need to be deployed.
 * Due to the dynamic nature of mosaic sites, files that are required, the snapshots, are not traced correctly.
 *
 * This script adds an entry into the [...route].js.nft.json file for each file in the provided snapshot ensuring that the snapshot files are deployed.
 *
 */
export async function updateTraceFile(config, options) {
  const { mode, platform } = config.deployment;

  if (mode === 'snapshot-file' && platform === 'vercel') {
    console.info(
      '[Mosaic] deployment platform is vercel...adding snapshot files to site output trace'
    );

    const projectBase = process.cwd();
    const buildDir = path.posix.join(projectBase, '.next');
    const snapshotDir = options.out;

    if (!fsExtra.existsSync(buildDir)) {
      console.warn(
        '[Mosaic] unable to update nextjs trace file.  Build the site before generating the snapshot'
      );
    }
    const nftFilePath = path.posix.join(buildDir, 'server', 'pages', '[...route].js.nft.json');

    // Find all snapshot files
    const paths = await globby(`**/${snapshotDir}/**`, {
      cwd: projectBase,
      onlyFiles: true
    });

    const data = JSON.parse(await fsExtra.promises.readFile(nftFilePath, 'utf-8'));

    // Add the snapshot file paths to the nft trace
    paths.forEach(snapshotFile => {
      // Determine relative path to the file we want to include
      const nftFileDir = path.posix.dirname(nftFilePath);
      const newEntry = path.posix.relative(nftFileDir, path.posix.resolve(snapshotFile));
      // Add the file and write our changes
      data.files.push(newEntry);
    });

    await fsExtra.promises.writeFile(nftFilePath, JSON.stringify(data));
  }
}
