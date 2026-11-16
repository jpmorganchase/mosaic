// Run after `yarn build`. Exercise actual tarballs in a project outside the
// checkout, with no workspace links, TypeScript aliases or skipLibCheck.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { verifyAuthConsumers } from './consumerAuth.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Next 16.3+ currently publishes DOM types only available in TypeScript 6.
// The repository builds libraries on TypeScript 5.9; this complete strict
// external Next consumer uses the compiler required by Next's declarations.
// https://github.com/vercel/next.js/issues/99631
const nextTypeScriptVersion = '6.0.3';
const yarn = path.join(root, '.yarn/releases/yarn-4.10.3.cjs');
const consumer = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-consumer-'));
const siteConsumer = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-site-consumer-'));
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
    '@jpmorganchase/mosaic-components',
    '@jpmorganchase/mosaic-content-editor-plugin',
    '@jpmorganchase/mosaic-layouts',
    '@jpmorganchase/mosaic-plugins',
    '@jpmorganchase/mosaic-site-components',
    '@jpmorganchase/mosaic-store',
    '@jpmorganchase/mosaic-theme'
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
    'next'
  ]) {
    dependencies[name] = (
      await readJson(path.join(root, 'node_modules', name, 'package.json'))
    ).version;
  }
  dependencies['@mosaic-test/extension'] = 'file:./extension.tgz';
  dependencies.typescript = nextTypeScriptVersion;
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
  execFileSync(
    'tar',
    [
      '-czf',
      path.join(consumer, 'extension.tgz'),
      '-C',
      path.join(consumer, 'extension'),
      'package'
    ],
    { windowsHide: true, timeout: 30_000 }
  );
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
  console.log(
    `External declarations passed on TypeScript ${nextTypeScriptVersion} with skipLibCheck: false`
  );
  console.log(run(['smoke.mjs']).trim());

  // Unpack the advertised site template outside both the checkout and the
  // package consumer, so neither can supply undeclared lint dependencies.
  const siteArchive = path.join(consumer, 'tarballs', 'site.tgz');
  run([yarn, 'workspace', '@jpmorganchase/mosaic-site', 'pack', '--out', siteArchive], root);
  execFileSync('tar', ['-xf', siteArchive, '--strip-components=1', '-C', siteConsumer], {
    windowsHide: true,
    timeout: 30_000
  });
  const siteManifest = await readJson(path.join(siteConsumer, 'package.json'));
  siteManifest.devDependencies.typescript = nextTypeScriptVersion;
  siteManifest.dependencies['@mosaic-test/extension'] = `file:${path
    .join(consumer, 'extension.tgz')
    .replaceAll('\\', '/')}`;
  siteManifest.resolutions = Object.fromEntries(
    Object.entries(resolutions).map(([name, archive]) => [
      name,
      `file:${path.resolve(consumer, archive.slice('file:'.length)).replaceAll('\\', '/')}`
    ])
  );
  siteManifest.packageManager = 'yarn@4.10.3';
  await fs.writeFile(
    path.join(siteConsumer, 'package.json'),
    JSON.stringify(siteManifest, null, 2)
  );
  await fs.copyFile(path.join(consumer, '.yarnrc.yml'), path.join(siteConsumer, '.yarnrc.yml'));
  await fs.cp(path.join(root, '.yarn/cache'), path.join(siteConsumer, '.yarn/cache'), {
    recursive: true
  });
  await fs.copyFile(path.join(root, 'yarn.lock'), path.join(siteConsumer, 'yarn.lock'));
  run([yarn, 'install'], siteConsumer);
  run([yarn, 'lint'], siteConsumer);
  // Prove the standalone configuration actually checks TypeScript, rather
  // than succeeding because the source files were ignored.
  await fs.writeFile(
    path.join(siteConsumer, 'src', 'lint-regression.ts'),
    'export const value = 1;\nconst unusedValue = 2;\n'
  );
  assert.throws(() => run([yarn, 'lint'], siteConsumer), /@typescript-eslint\/no-unused-vars/);
  console.log('Standalone packed site lint passed and detected a deliberate TypeScript error');
  await verifyAuthConsumers({ consumer, siteConsumer, root, run });
  // Only remove the isolated directory created by this invocation.
  assert.equal(path.dirname(consumer), path.resolve(os.tmpdir()));
  assert.ok(path.basename(consumer).startsWith('mosaic-consumer-'));
  await fs.rm(consumer, { recursive: true, force: true });
  assert.equal(path.dirname(siteConsumer), path.resolve(os.tmpdir()));
  assert.ok(path.basename(siteConsumer).startsWith('mosaic-site-consumer-'));
  await fs.rm(siteConsumer, { recursive: true, force: true });
} catch (error) {
  console.error(`Consumers retained for diagnosis: ${consumer}, ${siteConsumer}`);
  throw error;
}
