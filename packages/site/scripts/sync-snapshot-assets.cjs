const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { dirname, isAbsolute, relative, resolve, sep } = require('node:path');

const ASSETS = ['search-records.json', 'llms.txt', 'llms-full.txt'];
// Recognize prior generated output so upgrading a build removes it safely.
const RETIRED_ASSETS = ['search-data.json', 'search-data-condensed.json', 'search-config.json'];
const isScopedIndex = file =>
  /^(?:[a-z0-9_~-][a-z0-9._~-]*\/)+llms(?:-full)?\.txt$/.test(file.replaceAll('\\', '/'));

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
function syncSnapshotAssets({ snapshotDir, publicDir, manifestFile, copyMarkdown = true }) {
  publicDir = resolve(publicDir);
  const files = new Map();

  // Read and validate the next output before changing any existing files.
  if (snapshotDir) {
    for (const file of ASSETS) {
      const source = resolve(snapshotDir, file);
      if (existsSync(source)) files.set(file, readFileSync(source));
    }

    // Read only scopes owned by this generation; never glob stale nested files
    // left in a reused snapshot directory. This file is not a public asset.
    const manifestFile = resolve(snapshotDir, 'llms-manifest.json');
    if (existsSync(manifestFile)) {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      if (
        manifest?.version !== 1 ||
        !Array.isArray(manifest.scopes) ||
        new Set(manifest.scopes).size !== manifest.scopes.length ||
        manifest.scopes.some(
          scope =>
            typeof scope !== 'string' ||
            !scope.startsWith('/') ||
            scope.includes('\\') ||
            !isScopedIndex(`${scope.slice(1)}/llms.txt`)
        )
      ) {
        throw new Error(`[mosaic-site] Invalid LLM manifest ${manifestFile}`);
      }
      for (const scope of manifest.scopes) {
        for (const name of ['llms.txt', 'llms-full.txt']) {
          const file = `${scope.slice(1)}/${name}`;
          files.set(file, readFileSync(resolve(snapshotDir, file)));
        }
      }
    }

    const markdownFile = resolve(snapshotDir, 'markdown-pages.json');
    // Server builds serve generated Markdown through the handler, preserving
    // its headers and manifest checks while authored public .md files still win.
    if (copyMarkdown && existsSync(markdownFile)) {
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
      // Older snapshots may retain authored trailing slashes. Match the server
      // normalization and omit ambiguous canonical routes instead of choosing one.
      const pages = Object.entries(markdown.pages).map(([route, content]) => [
        route === '/' ? route : route.replace(/\/+$/, ''),
        content
      ]);
      const counts = new Map();
      for (const [route] of pages)
        counts.set(route.toLowerCase(), (counts.get(route.toLowerCase()) ?? 0) + 1);
      const canonicalPages = new Map(
        pages.filter(([route]) => counts.get(route.toLowerCase()) === 1)
      );
      for (const [route, content] of canonicalPages) {
        if (!route.startsWith('/')) continue;
        const folder = route.endsWith('/index') ? route.slice(0, -'/index'.length) : undefined;
        for (const url of folder ? [route, folder] : [route]) {
          if (url === folder && counts.has(url.toLowerCase())) continue;
          const target = publicPath(publicDir, `.${url}.md`);
          if (target) files.set(relative(publicDir, target), content);
        }
      }
      // Keep URLs already linked by the text indexes of an older snapshot.
      for (const [authoredRoute, content] of Object.entries(markdown.pages)) {
        const route = authoredRoute === '/' ? authoredRoute : authoredRoute.replace(/\/+$/, '');
        if (route === authoredRoute || !canonicalPages.has(route) || !route.startsWith('/'))
          continue;
        const target = publicPath(publicDir, `.${authoredRoute}.md`);
        if (target) files.set(relative(publicDir, target), content);
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
          (!ASSETS.includes(file) &&
            !RETIRED_ASSETS.includes(file) &&
            !isScopedIndex(file) &&
            !file.endsWith('.md'))
      )
    ) {
      throw new Error(`[mosaic-site] Invalid public asset manifest ${manifestFile}`);
    }
    previous = manifest.files;
  }

  // LLM routes are reserved. Do not silently overwrite an authored public asset.
  for (const [file, content] of files) {
    const target = publicPath(publicDir, file);
    if (
      (isScopedIndex(file) || /^llms(?:-full)?\.txt$/.test(file)) &&
      existsSync(target) &&
      !previous.includes(file) &&
      !readFileSync(target).equals(Buffer.from(content))
    ) {
      throw new Error(`[mosaic-site] Reserved LLM route collides with public asset: ${file}`);
    }
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
