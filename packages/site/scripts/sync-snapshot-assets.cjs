const { createHash } = require('node:crypto');
const {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require('node:fs');
const { dirname, isAbsolute, relative, resolve, sep } = require('node:path');
const {
  decodeRoutePathname,
  encodeRoutePathname
} = require('@jpmorganchase/mosaic-schemas/routePath');

const ASSETS = ['search-records.json', 'llms.txt', 'llms-full.txt'];
// Recognize prior generated output so upgrading a build removes it safely.
const RETIRED_ASSETS = ['search-data.json', 'search-data-condensed.json', 'search-config.json'];
const isScopedIndex = file =>
  /^(?:[a-z0-9_~-][a-z0-9._~-]*\/)+llms(?:-full)?\.txt$/.test(file.replaceAll('\\', '/'));
const markdownHash = content => createHash('sha256').update(content).digest('hex');

function publicPath(publicDir, file) {
  const target = resolve(publicDir, file);
  return target.startsWith(publicDir + sep) ? target : undefined;
}

function snapshotMarkdown(snapshotDir, publicDir) {
  const files = new Map();
  const markdownFile = resolve(snapshotDir, 'markdown-pages.json');
  if (!existsSync(markdownFile)) return files;
  const markdown = JSON.parse(readFileSync(markdownFile, 'utf8'));
  if (
    (markdown?.version !== 1 && markdown?.version !== 2) ||
    !markdown.pages ||
    typeof markdown.pages !== 'object' ||
    Array.isArray(markdown.pages) ||
    Object.values(markdown.pages).some(value => typeof value !== 'string')
  ) {
    throw new Error(`[mosaic-site] Invalid Markdown pages in ${markdownFile}`);
  }
  const add = (url, content) => {
    const target = publicPath(publicDir, `.${url}.md`);
    if (target) files.set(relative(publicDir, target), content);
  };
  // Normalize older snapshot routes and keep their linked trailing-slash URLs.
  const normalize = route => (route === '/' ? route : route.replace(/\/+$/, ''));
  const pages = Object.entries(markdown.pages).map(([route, body]) => {
    if (markdown.version === 1) return [route, body];
    const decoded = decodeRoutePathname(route);
    if (decoded === undefined || encodeRoutePathname(route) !== route) {
      throw new Error(`[mosaic-site] Invalid Markdown route in ${markdownFile}: ${route}`);
    }
    return [decoded, body];
  });
  const counts = new Map();
  for (const [route] of pages) {
    const key = normalize(route).toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [authoredRoute, content] of pages) {
    const route = normalize(authoredRoute);
    if (!route.startsWith('/') || counts.get(route.toLowerCase()) !== 1) continue;
    add(route, content);
    const folder = route.endsWith('/index') ? route.slice(0, -'/index'.length) : '';
    if (folder && !counts.has(folder.toLowerCase())) add(folder, content);
    if (route !== authoredRoute) add(authoredRoute, content);
  }
  return files;
}

/**
 * Copy the current snapshot's public files, removing only files emitted by a
 * previous build. Keep the manifest outside public/ so it isn't served. An
 * active-mode build supplies no snapshot and removes the old snapshot copies,
 * allowing requests to reach the live route handlers again.
 *
 * The manifest records a hash of each Markdown copy, and a copy that no longer
 * matches it has been replaced by an author, so it is left alone. Older
 * manifests list paths alone, from builds that overwrote every listed copy, so
 * those copies are still replaced or removed like any other generated file.
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
        (manifest?.version !== 1 && manifest?.version !== 2) ||
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
  }

  let previous = [];
  let previousMarkdown;
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
      ) ||
      (manifest.markdownHashes !== undefined &&
        (typeof manifest.markdownHashes !== 'object' ||
          manifest.markdownHashes === null ||
          Array.isArray(manifest.markdownHashes) ||
          Object.values(manifest.markdownHashes).some(hash => typeof hash !== 'string')))
    ) {
      throw new Error(`[mosaic-site] Invalid public asset manifest ${manifestFile}`);
    }
    previous = manifest.files;
    if (manifest.markdownHashes !== undefined)
      previousMarkdown = new Map(Object.entries(manifest.markdownHashes));
  }
  const previousFiles = new Set(previous);

  // Server builds serve generated Markdown through the handler, preserving its
  // headers and manifest checks while authored public .md files still win.
  if (snapshotDir && copyMarkdown) {
    for (const [file, content] of snapshotMarkdown(snapshotDir, publicDir))
      files.set(file, content);
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
  // An edited Markdown copy now belongs to the author. Without recorded hashes,
  // every listed copy is one the previous build wrote unconditionally.
  const ownsMarkdown = (file, target, stat) =>
    stat?.isFile() &&
    (previousMarkdown
      ? previousMarkdown.get(file) === markdownHash(readFileSync(target))
      : previousFiles.has(file));
  const markdownHashes = new Map();
  for (const [file, content] of files) {
    const target = publicPath(publicDir, file);
    if (file.endsWith('.md')) {
      const stat = lstatSync(target, { throwIfNoEntry: false });
      if (stat && !ownsMarkdown(file, target, stat)) {
        files.delete(file);
        continue;
      }
      markdownHashes.set(file, markdownHash(content));
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  for (const file of previous) {
    if (files.has(file)) continue;
    const target = publicPath(publicDir, file);
    if (
      file.endsWith('.md') &&
      !ownsMarkdown(file, target, lstatSync(target, { throwIfNoEntry: false }))
    )
      continue;
    rmSync(target, { force: true });
  }

  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(
    manifestFile,
    JSON.stringify({
      version: 1,
      files: [...files.keys()].sort(),
      markdownHashes: Object.fromEntries(markdownHashes)
    })
  );
}

module.exports = { syncSnapshotAssets };
