import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

async function assertNoAuth(cwd) {
  const require = createRequire(path.join(cwd, 'package.json'));
  assert.throws(() => require.resolve('next-auth'), { code: 'MODULE_NOT_FOUND' });
  const fromComponents = createRequire(require.resolve('@jpmorganchase/mosaic-site-components'));
  assert.throws(() => fromComponents.resolve('next-auth'), { code: 'MODULE_NOT_FOUND' });
  // Also reject an unrelated nested installation, not just a resolvable root peer.
  async function scanModules(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(error => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      assert.notEqual(entry.name, 'next-auth', `Auth.js unexpectedly installed at ${directory}`);
      const packagePath = path.join(directory, entry.name);
      if (entry.name.startsWith('@')) await scanModules(packagePath);
      else await scanModules(path.join(packagePath, 'node_modules'));
    }
  }
  await scanModules(path.join(cwd, 'node_modules'));
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function checkBrowser(cwd, { development = false, authenticated = false } = {}) {
  const require = createRequire(path.join(cwd, 'package.json'));
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [
      require.resolve('next/dist/bin/next'),
      development ? 'dev' : 'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port)
    ],
    {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
    }
  );
  let output = '';
  let spawnError;
  server.on('error', error => {
    spawnError = error;
  });
  const capture = chunk => {
    output = `${output}${chunk}`.slice(-30_000);
  };
  server.stdout.on('data', capture);
  server.stderr.on('data', capture);
  let browser;
  try {
    let html;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      assert.ifError(spawnError);
      assert.equal(server.exitCode, null, output);
      const response = await fetch(origin, { signal: AbortSignal.timeout(5_000) }).catch(
        () => undefined
      );
      if (response?.ok) {
        html = await response.text();
        break;
      }
      await delay(250);
    }
    assert.ok(html, `Consumer server did not become ready:\n${output}`);
    assert.match(html, /Packed consumer/);
    assert.match(html, /Select an action/);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    const authRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (
        message.type() === 'error' &&
        /hydrat|did not match|ClientFetchError/i.test(message.text())
      )
        errors.push(message.text());
    });
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/auth/'))
        authRequests.push(request.url());
    });
    await page.goto(origin);
    await page.waitForFunction(() => document.documentElement.dataset.consumerHydrated === 'true');
    assert.equal(
      await page.getByTestId('auth').textContent(),
      authenticated ? 'authenticated:true' : 'unauthenticated:false'
    );
    assert.equal(await page.getByRole('link', { name: 'Login', exact: true }).count(), 0);
    assert.equal(
      await page.getByTestId('extension').textContent(),
      'Extension /consumer/index light'
    );
    await page.getByTestId('extension').click();
    assert.equal(await page.getByTestId('host-mode').textContent(), 'dark');
    // The separately packed extension must share both host contexts on remount.
    const before = await page.locator('html').getAttribute('data-consumer-mounts');
    const header = await page.getByRole('banner').elementHandle();
    await page.getByRole('button', { name: 'Toggle content' }).click();
    await page.getByRole('button', { name: 'Toggle content' }).click();
    await page.getByTestId('extension').waitFor();
    assert.equal(await header.evaluate(node => node === document.querySelector('header')), true);
    assert.equal(
      await page.getByTestId('extension').textContent(),
      'Extension /consumer/index dark'
    );
    const after = await page.locator('html').getAttribute('data-consumer-mounts');
    assert.ok(Number(after) > Number(before));
    if (development) assert.ok(Number(before) >= 2, 'Strict Mode did not repeat the mount effect');
    // Execute the packed mode-only bootstrap and then hydrate a persisted dark preference.
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.consumerHydrated === 'true');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="host-mode"]')?.textContent === 'dark'
    );
    assert.equal(await page.getByTestId('host-mode').textContent(), 'dark');
    assert.equal(await page.locator('html').getAttribute('data-mode'), 'dark');
    if (authenticated) await page.getByText('Welcome, Reader').waitFor();
    else {
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(100);
      assert.deepEqual(authRequests, [], 'No-auth host made authentication requests');
    }
    assert.deepEqual(errors, [], `Consumer hydration failed:\n${errors.join('\n')}`);
  } finally {
    await browser?.close();
    if (server.exitCode === null && server.pid) {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], {
          windowsHide: true,
          stdio: 'ignore'
        });
      } else server.kill('SIGTERM');
    }
  }
}

export async function verifyAuthConsumers({ consumer, siteConsumer, root, run }) {
  await assertNoAuth(consumer);
  run(['node_modules/next/dist/bin/next', 'build'], consumer);
  await checkBrowser(consumer);
  await checkBrowser(consumer, { development: true });
  await assertNoAuth(consumer);
  console.log(
    'Absent-auth packed Next host passed declarations, SSR, hydration and Strict Mode without session requests'
  );

  // A separate root prevents Next from discovering the template's instrumentation
  // through an inferred Turbopack workspace root. All Mosaic packages stay packed.
  const authHost = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-auth-consumer-'));
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(consumer, 'package.json'), 'utf8'));
    manifest.name = 'mosaic-auth-consumer';
    const absoluteArchive = archive =>
      `file:${path.resolve(consumer, archive.slice('file:'.length)).replaceAll('\\', '/')}`;
    manifest.resolutions = Object.fromEntries(
      Object.entries(manifest.resolutions).map(([name, archive]) => [
        name,
        absoluteArchive(archive)
      ])
    );
    for (const [name, version] of Object.entries(manifest.dependencies)) {
      if (version.startsWith('file:')) manifest.dependencies[name] = absoluteArchive(version);
    }
    manifest.dependencies['next-auth'] = JSON.parse(
      await fs.readFile(path.join(siteConsumer, 'node_modules/next-auth/package.json'), 'utf8')
    ).version;
    await fs.writeFile(path.join(authHost, 'package.json'), JSON.stringify(manifest, null, 2));
    await fs.copyFile(path.join(consumer, '.yarnrc.yml'), path.join(authHost, '.yarnrc.yml'));
    for (const installed of [consumer, siteConsumer]) {
      await fs.cp(path.join(installed, '.yarn/cache'), path.join(authHost, '.yarn/cache'), {
        recursive: true
      });
    }
    await fs.copyFile(path.join(siteConsumer, 'yarn.lock'), path.join(authHost, 'yarn.lock'));
    run([path.join(root, '.yarn/releases/yarn-4.10.3.cjs'), 'install'], authHost);
    await fs.cp(path.join(root, 'scripts/consumer/app'), path.join(authHost, 'app'), {
      recursive: true
    });
    await fs.copyFile(
      path.join(root, 'scripts/consumer/next.config.mjs'),
      path.join(authHost, 'next.config.mjs')
    );
    const tsconfig = JSON.parse(
      await fs.readFile(path.join(root, 'scripts/consumer/tsconfig.json'), 'utf8')
    );
    tsconfig.include = ['next-env.d.ts', 'app/**/*.tsx'];
    // Auth.js beta.32 publishes broken React 19 declarations. Its real provider
    // is a JS runtime bootstrap; the adjacent TS fixture checks Mosaic's public
    // adapter declarations with skipLibCheck:false, without patching Auth.js.
    tsconfig.compilerOptions.allowJs = true;
    tsconfig.compilerOptions.checkJs = false;
    await fs.writeFile(path.join(authHost, 'tsconfig.json'), JSON.stringify(tsconfig));
    for (const file of ['auth-wrapper.jsx', 'auth-wrapper.d.ts', 'auth-contract.tsx']) {
      await fs.copyFile(
        path.join(root, 'scripts/consumer', file),
        path.join(authHost, 'app', file)
      );
    }
    await fs.writeFile(
      path.join(authHost, 'app/page.tsx'),
      "import { ConsumerHost } from './consumer-host';\nimport { AuthWrapper } from './auth-wrapper';\nexport default function Page() { return <AuthWrapper><ConsumerHost /></AuthWrapper>; }\n"
    );
    const require = createRequire(path.join(authHost, 'package.json'));
    assert.ok(require.resolve('next-auth').startsWith(authHost));
    run(['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'], authHost);
    run(['node_modules/next/dist/bin/next', 'build'], authHost);
    await checkBrowser(authHost, { authenticated: true });
    console.log(
      'Installed-auth host passed strict Mosaic adapter declarations and real Auth.js runtime SSR/hydration; upstream Auth.js declarations are outside this fixture boundary'
    );
    assert.equal(path.dirname(authHost), path.resolve(os.tmpdir()));
    assert.ok(path.basename(authHost).startsWith('mosaic-auth-consumer-'));
    await fs.rm(authHost, { recursive: true, force: true });
  } catch (error) {
    console.error(`Authenticated consumer retained for diagnosis: ${authHost}`);
    throw error;
  }
}
