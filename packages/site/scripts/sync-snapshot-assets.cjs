const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { dirname, isAbsolute, relative, resolve, sep } = require('node:path');

const ASSETS = ['search-data.json', 'search-records.json', 'llms.txt', 'llms-full.txt'];

function publicPath(publicDir, file) {
  const target = resolve(publicDir, file);
  return target.startsWith(publicDir + sep) ? target : undefined;
}

/**
 * Copy the current snapshot's public files, removing only files emitted by a
 * previous build. Keep the manifest outside public/ so it isn't served. An
 * active-mode build supplies no snapshot and removes the old snapshot copies,
 * allowing requests to reach the live route handlers again.
 */
function syncSnapshotAssets({ snapshotDir, publicDir, manifestFile }) {
  publicDir = resolve(publicDir);
  const files = new Map();

  // Read and validate the next output before changing any existing files.
  if (snapshotDir) {
    for (const file of ASSETS) {
      const source = resolve(snapshotDir, file);
      if (existsSync(source)) files.set(file, readFileSync(source));
    }

    const markdownFile = resolve(snapshotDir, 'markdown-pages.json');
    if (existsSync(markdownFile)) {
      const markdown = JSON.parse(readFileSync(markdownFile, 'utf8'));
      if (
        markdown?.version !== 1 ||
        !markdown.pages ||
        typeof markdown.pages !== 'object' ||
        Array.isArray(markdown.pages) ||
        Object.values(markdown.pages).some(value => typeof value !== 'string')
      ) {
        throw new Error(`[mosaic-site] Invalid Markdown pages in ${markdownFile}`);
      }
      for (const [route, content] of Object.entries(markdown.pages)) {
        if (!route.startsWith('/')) continue;
        const folder = route.endsWith('/index') ? route.slice(0, -'/index'.length) : undefined;
        for (const url of folder ? [route, folder] : [route]) {
          if (url === folder && Object.hasOwn(markdown.pages, url)) continue;
          const target = publicPath(publicDir, `.${url}.md`);
          if (target) files.set(relative(publicDir, target), content);
        }
      }
    }
  }

  let previous = [];
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    if (
      manifest?.version !== 1 ||
      !Array.isArray(manifest.files) ||
      manifest.files.some(
        file =>
          typeof file !== 'string' ||
          isAbsolute(file) ||
          !publicPath(publicDir, file) ||
          (!ASSETS.includes(file) && !file.endsWith('.md'))
      )
    ) {
      throw new Error(`[mosaic-site] Invalid public asset manifest ${manifestFile}`);
    }
    previous = manifest.files;
  }

  for (const [file, content] of files) {
    const target = publicPath(publicDir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  for (const file of previous) {
    if (!files.has(file)) rmSync(publicPath(publicDir, file), { force: true });
  }

  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, JSON.stringify({ version: 1, files: [...files.keys()].sort() }));
}

module.exports = { syncSnapshotAssets };
