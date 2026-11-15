// Run after `yarn build`: node scripts/snapshot/cacheIdentitySmoke.mjs
// Builds the reference site twice, retaining Next's data cache while the CLI
// replaces a temporary snapshot at the same path. Also checks standalone tracing.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = path.join(repo, 'packages/site');
const snapshots = path.join(site, 'snapshots');
await fs.mkdir(snapshots, { recursive: true });
await fs.mkdir(path.join(repo, '.tmp'), { recursive: true });
const snapshot = await fs.mkdtemp(path.join(snapshots, 'cache-identity-smoke-'));
// Cleanup is limited to the uniquely allocated fixture under this repository.
if (
  path.dirname(snapshot) !== snapshots ||
  !path.basename(snapshot).startsWith('cache-identity-smoke-')
) {
  throw new Error(`Unexpected snapshot fixture path: ${snapshot}`);
}
const logs = await fs.mkdtemp(path.join(repo, '.tmp/snapshot-cache-smoke-'));
const runId = randomUUID();
const env = {
  ...process.env,
  MOSAIC_MODE: 'snapshot-file',
  MOSAIC_SNAPSHOT_DIR: `./snapshots/${path.basename(snapshot)}`,
  MOSAIC_OUTPUT: 'standalone',
  MOSAIC_DISABLE_LOADER_CACHE: 'false',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3223'
};

async function run(args, name, nodeEnv) {
  const log = await fs.open(path.join(logs, `${name}.log`), 'w');
  console.log(`[snapshot-cache-smoke] ${name}`);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: site,
        env: { ...env, NODE_ENV: nodeEnv },
        stdio: ['ignore', log.fd, log.fd],
        windowsHide: true
      });
      child.once('error', reject);
      child.once('exit', code =>
        code === 0 ? resolve() : reject(new Error(`${name} exited ${code}; see ${logs}`))
      );
    });
  } finally {
    await log.close();
  }
}

async function cacheEntries() {
  const directory = path.join(site, '.next/cache/fetch-cache');
  const entries = new Map();
  for (const file of await fs.readdir(directory)) {
    const target = path.join(directory, file);
    if ((await fs.stat(target)).isFile()) entries.set(file, await fs.readFile(target, 'utf8'));
  }
  return entries;
}

async function generation(label) {
  await run(
    [
      path.join(repo, 'packages/cli/dist/index.mjs'),
      'build',
      '--out',
      'snapshots',
      '--name',
      path.basename(snapshot),
      '--config',
      'mosaic.config.mjs'
    ],
    `snapshot-${label}`,
    'development'
  );
  const identity = JSON.parse(
    await fs.readFile(path.join(snapshot, 'mosaic-snapshot.json'), 'utf8')
  );
  assert.equal(identity.version, 1);
  assert.match(identity.id, /^[0-9a-f-]{36}$/);
  const body = `MosaicCacheBody${label}-${runId}`;
  const header = `MosaicCacheHeader${label}-${runId}`;
  await fs.appendFile(path.join(snapshot, 'mosaic/index.mdx'), `\n\n${body}\n`);
  const sharedFile = path.join(snapshot, 'mosaic/shared-config.json');
  const shared = JSON.parse(await fs.readFile(sharedFile, 'utf8'));
  shared.config.header.title = header;
  await fs.writeFile(sharedFile, JSON.stringify(shared));
  await run(
    [path.join(repo, 'node_modules/next/dist/bin/next'), 'build'],
    `build-${label}`,
    'production'
  );
  const html = await fs.readFile(path.join(site, '.next/server/app/mosaic/index.html'), 'utf8');
  assert(html.includes(body), `Build ${label} did not render the new MDX`);
  assert(html.includes(header), `Build ${label} did not render the new shared configuration`);
  const packagedIdentity = path.join(
    site,
    '.next/standalone/packages/site/snapshots',
    path.basename(snapshot),
    'mosaic-snapshot.json'
  );
  assert.deepEqual(JSON.parse(await fs.readFile(packagedIdentity, 'utf8')), identity);
  const entries = await cacheEntries();
  assert(
    [...entries.values()].some(value => value.includes(body)),
    'MDX must reach the real Next data cache'
  );
  assert(
    [...entries.values()].some(value => value.includes(header)),
    'Shared config must reach the real Next data cache'
  );
  return { identity, body, header, html, entries };
}

try {
  const first = await generation('A');
  const second = await generation('B');
  assert.notEqual(second.identity.id, first.identity.id);
  assert(!second.html.includes(first.body), 'The prior generation leaked into rendered MDX');
  assert(
    !second.html.includes(first.header),
    'The prior generation leaked into shared configuration'
  );
  const oldEntries = [...first.entries].filter(
    ([, value]) => value.includes(first.body) || value.includes(first.header)
  );
  for (const [key, value] of oldEntries) {
    assert.equal(
      second.entries.get(key),
      value,
      'The test must retain old Next cache entries across builds'
    );
  }
  console.log(
    JSON.stringify({
      result: 'passed',
      generations: [first.identity.id, second.identity.id],
      retainedCacheEntries: oldEntries.length,
      standaloneIdentity: true,
      logs
    })
  );
} finally {
  await fs.rm(snapshot, { recursive: true, force: true });
}
