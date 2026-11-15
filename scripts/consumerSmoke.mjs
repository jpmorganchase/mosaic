// Run after `yarn build`. Exercise actual tarballs in a project outside the
// checkout, with no workspace links, TypeScript aliases or skipLibCheck.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const yarn = path.join(root, '.yarn/releases/yarn-4.10.3.cjs');
const consumer = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-consumer-'));
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const run = (args, cwd = consumer) => {
  try {
    return execFileSync(process.execPath, args, {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 300_000,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' }
    });
  } catch (error) {
    throw new Error(`${args.join(' ')} failed\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, {
      cause: error
    });
  }
};

try {
  const dependencies = {};
  const resolutions = {};
  const entryPackages = new Set([
    '@jpmorganchase/mosaic-cli',
    '@jpmorganchase/mosaic-plugins',
    '@jpmorganchase/mosaic-site-components'
  ]);
  await fs.mkdir(path.join(consumer, 'tarballs'));
  for (const entry of await fs.readdir(path.join(root, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = await readJson(path.join(root, 'packages', entry.name, 'package.json')).catch(
      error => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      }
    );
    if (!manifest) continue;
    if (manifest.private) continue;
    const archive = path.join(consumer, 'tarballs', `${entry.name}.tgz`);
    run([yarn, 'workspace', manifest.name, 'pack', '--out', archive], root);
    resolutions[manifest.name] = `file:./tarballs/${entry.name}.tgz`;
    if (entryPackages.has(manifest.name)) dependencies[manifest.name] = resolutions[manifest.name];
  }
  for (const name of [
    'typescript',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'react',
    'react-dom',
    'next',
    'next-auth'
  ]) {
    dependencies[name] = (
      await readJson(path.join(root, 'node_modules', name, 'package.json'))
    ).version;
  }
  await fs.writeFile(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'mosaic-packed-consumer',
        private: true,
        type: 'module',
        packageManager: 'yarn@4.10.3',
        dependencies,
        resolutions
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(consumer, '.yarnrc.yml'),
    [
      'nodeLinker: node-modules',
      'enableGlobalCache: false',
      'enableTransparentWorkspaces: false',
      'cacheFolder: .yarn/cache',
      'enableScripts: false'
    ].join('\n')
  );
  // Give the consumer its own cache: Yarn may prune unused archives during
  // installation, which must not remove packages from the checkout's cache.
  await fs.cp(path.join(root, '.yarn/cache'), path.join(consumer, '.yarn/cache'), {
    recursive: true
  });
  // Reuse the repository's external dependency versions; file resolutions
  // above replace every internal workspace dependency with an actual tarball.
  await fs.copyFile(path.join(root, 'yarn.lock'), path.join(consumer, 'yarn.lock'));
  await fs.cp(path.join(root, 'scripts/consumer'), consumer, { recursive: true });
  console.log(
    `Packed ${
      Object.keys(resolutions).length
    } packages; installing external consumer at ${consumer}`
  );
  run([yarn, 'install']);
  for (const name of Object.keys(resolutions)) {
    const installed = await fs.realpath(path.join(consumer, 'node_modules', name)).catch(error => {
      if (error.code === 'ENOENT' && !entryPackages.has(name)) return undefined;
      throw error;
    });
    if (!installed) continue;
    assert.ok(installed.startsWith(`${consumer}${path.sep}`), `${name} links outside the consumer`);
  }
  run(['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json']);
  console.log('External declarations passed with skipLibCheck: false');
  console.log(run(['smoke.mjs']).trim());
  // Only remove the isolated directory created by this invocation.
  assert.equal(path.dirname(consumer), path.resolve(os.tmpdir()));
  assert.ok(path.basename(consumer).startsWith('mosaic-consumer-'));
  await fs.rm(consumer, { recursive: true, force: true });
} catch (error) {
  console.error(`Consumer retained for diagnosis: ${consumer}`);
  throw error;
}
