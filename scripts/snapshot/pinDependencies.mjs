/**
 * Changesets leaves workspace ranges unchanged when creating snapshots.
 * `workspace:^` would pack as a range that accepts later snapshots, too.
 * Prepare exact internal dependencies before the root build, including when
 * an older trusted release workflow builds a newer pull request checkout.
 * Normal builds leave every manifest untouched.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SNAPSHOT_VERSION } from './validateTarballs.mjs';

export async function pinSnapshotDependencies(repoRoot) {
  const packagesDir = path.join(repoRoot, 'packages');
  const packages = [];
  for (const dir of await readdir(packagesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = path.join(packagesDir, dir.name, 'package.json');
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch (error) {
      // Old build output may remain after a workspace has been removed.
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const manifest = JSON.parse(source);
    if (!manifest.private) packages.push({ file, source, manifest });
  }

  const snapshot = packages.find(({ manifest }) => SNAPSHOT_VERSION.test(manifest.version));
  if (!snapshot) return;
  const { version } = snapshot.manifest;
  if (packages.some(({ manifest }) => manifest.version !== version)) {
    throw new Error('All public packages must have the same snapshot version before building.');
  }

  const names = new Set(packages.map(({ manifest }) => manifest.name));
  for (const { file, source, manifest } of packages) {
    let changed = false;
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies'
    ]) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (names.has(name) && ['workspace:^', 'workspace:~'].includes(range)) {
          manifest[field][name] = 'workspace:*';
          changed = true;
        }
      }
    }
    if (changed) {
      const newline = source.includes('\r\n') ? '\r\n' : '\n';
      await writeFile(
        file,
        `${JSON.stringify(manifest, null, 2).replaceAll('\n', newline)}${newline}`
      );
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  await pinSnapshotDependencies(path.resolve(import.meta.dirname, '..', '..'));
}
