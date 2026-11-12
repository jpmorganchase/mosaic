// Run against an active production build; see the editor README. All content,
// authentication and save events are synthetic and stay on loopback interfaces.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(siteDir, '../..');
const secret = randomBytes(32).toString('base64');
const authoredBody = 'Original paragraph.\n';
let saveEvents;
const saves = [];
const content = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://fixture.test').pathname;
  if (pathname === '/workflows/defaults' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    assert.equal(request.headers.authorization, 'Bearer test-token-placeholder');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        supportsCommitMessage: true,
        commitMessage: `docs: ${input.isNewPage ? 'create' : 'update'} ${input.route}`
      })
    );
  } else if (pathname === '/workflows/jobs' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    saves.push(JSON.parse(body));
    response.writeHead(202, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ jobId: 'editor-history-fixture' }));
  } else if (pathname === '/workflows/jobs/editor-history-fixture/events') {
    saveEvents = response;
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    response.write(': fixture ready\n\n');
  } else if (pathname.endsWith('/shared-config.json')) {
    response.end(
      JSON.stringify({
        config: {
          sourceCapabilities: { writable: true },
          header: { title: 'Editor fixture', menu: [{ title: 'Home', link: '/docs/index' }] }
        }
      })
    );
  } else if (pathname === '/_mosaic-raw/docs/page.mdx') {
    response.setHeader('x-mosaic-raw-namespace', 'docs');
    response.end(`---\ntitle: Authored title\nlayout: DetailTechnical\n---\n${authoredBody}`);
  } else if (pathname === '/docs' || pathname === '/docs/index.mdx') {
    response.end(
      '---\ntitle: Start\nlayout: DetailTechnical\nroute: /docs/index\n---\n[Edit page](/docs/page?edit=1&mode=source)\n\n[Create page](/docs/new?new=1&mode=source)\n'
    );
  } else if (pathname === '/docs/page' || pathname === '/docs/page.mdx') {
    response.end(
      '---\ntitle: Processed title\nlayout: DetailTechnical\nroute: /docs/page\nfullPath: /docs/page.mdx\n---\nProcessed paragraph.\n'
    );
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(resolve => content.listen(0, '127.0.0.1', resolve));
const contentUrl = `http://127.0.0.1:${content.address().port}`;
// Allocate a free loopback port before launching Next (its port-0 log format
// is not an API). Each independently running harness gets its own ports.
const portProbe = http.createServer();
await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
const sitePort = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const origin = `http://127.0.0.1:${sitePort}`;
const child = spawn(
  process.execPath,
  [
    path.join(rootDir, 'node_modules/next/dist/bin/next'),
    'start',
    '--port',
    String(sitePort),
    '--hostname',
    '127.0.0.1'
  ],
  {
    cwd: siteDir,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      MOSAIC_MODE: 'active',
      MOSAIC_ACTIVE_MODE_URL: contentUrl,
      MOSAIC_AUTH_ENABLED: 'true',
      AUTH_SECRET: secret,
      MOSAIC_EDITORS: 'editor@example.test',
      MOSAIC_WORKFLOWS_URL: contentUrl,
      MOSAIC_WORKFLOWS_SECRET: 'test-token-placeholder'
    }
  }
);
let serverOutput = '';
child.stdout.on('data', data => {
  serverOutput += data;
});
child.stderr.on('data', data => {
  serverOutput += data;
});
let browser;
let page;
try {
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`${origin}/docs`)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 }
    )
    .toBe(200);
  const engine = process.env.MOSAIC_TEST_BROWSER || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(engine));
  browser = await { chromium, firefox, webkit }[engine].launch({
    headless: true,
    ...(process.env.MOSAIC_TEST_BROWSER_EXECUTABLE
      ? { executablePath: process.env.MOSAIC_TEST_BROWSER_EXECUTABLE }
      : {})
  });
  console.log(`Testing ${engine} ${browser.version()}`);
  const context = await browser.newContext();
  const token = await encode({
    secret,
    salt: 'authjs.session-token',
    token: { sub: 'editor-history', name: 'Editor fixture', email: 'editor@example.test' },
    maxAge: 3600
  });
  await context.addCookies([
    { name: 'authjs.session-token', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }
  ]);
  page = await context.newPage();
  page.on('dialog', async dialog => {
    console.log(`Native dialog: ${dialog.type()} (dismissed to keep editing)`);
    await dialog.dismiss();
  });
  page.on('console', message => {
    if (message.text().startsWith('History traversal:')) console.log(message.text());
  });
  page.setDefaultTimeout(15_000);
  const body = page.getByRole('textbox', { name: 'Markdown source editor' });
  const guard = page.getByRole('dialog', { name: 'Unsaved changes' });
  // Await the traversal's completion or cancellation before starting another
  // gesture. Bare history.back/forward return before their queue has settled.
  const back = () => page.evaluate(() => window.navigation.back().finished.catch(() => {}));
  const forward = () => page.evaluate(() => window.navigation.forward().finished.catch(() => {}));
  const browserTraversal = async direction => {
    const before = await page.evaluate(() => window.navigation.currentEntry.index);
    try {
      // A canceled browser gesture has no committed navigation for Playwright
      // to await. The guard assertion below verifies the reason for a timeout.
      if (direction === 'back') await page.goBack({ waitUntil: 'commit', timeout: 1000 });
      else await page.goForward({ waitUntil: 'commit', timeout: 1000 });
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
    }
    console.log(`Browser ${direction}:`, {
      before,
      after: await page.evaluate(() => window.navigation.currentEntry.index)
    });
  };
  await page.goto(`${origin}/docs`);
  await page.getByRole('link', { name: 'Edit page', exact: true }).click();
  await expect(body).toHaveValue(authoredBody);
  assert.equal(
    await page.evaluate(() => typeof window.navigation),
    'object',
    'This browser lacks the Navigation API; same-document traversal protection is unavailable.'
  );
  await page.evaluate(() =>
    window.navigation.addEventListener('navigate', event => {
      if (event.navigationType === 'traverse')
        console.log(
          'History traversal:',
          JSON.stringify({
            cancelable: event.cancelable,
            sameDocument: event.destination.sameDocument
          })
        );
    })
  );

  // Keep preserves the live draft; Discard follows the original history entry.
  await body.fill('Draft body');
  await browserTraversal('back');
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(body).toHaveValue('Draft body');
  await back();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('link', { name: 'Edit page', exact: true })).toBeVisible();
  await forward();
  await expect(body).toHaveValue(authoredBody);
  await body.fill('Next draft');
  await back();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  console.log('PASS: Back Keep/Discard, history ordering and next dirty traversal.');

  // A real local Server Action and SSE stream exercise saving and saved states.
  await body.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
  const commitMessage = page.getByRole('textbox', { name: 'Commit message', exact: true });
  await expect(commitMessage).toHaveValue('docs: update /docs/page.mdx');
  const resetMessage = page.getByRole('button', { name: 'Reset to default', exact: true });
  await resetMessage.scrollIntoViewIfNeeded();
  await expect(resetMessage).toBeInViewport();
  await resetMessage.click();
  const filePath = page.getByRole('textbox', { name: 'File path', exact: true });
  await filePath.scrollIntoViewIfNeeded();
  await expect(filePath).toBeInViewport();
  await commitMessage.fill('Explain the editor change\n\nKeep the authored message.');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Visual editor (WYSIWYG)', { exact: true }).click();
  await expect(page.locator('[contenteditable="true"]')).toBeVisible();
  await page.getByLabel('Source editor (raw markdown)', { exact: true }).click();
  await expect(body).toHaveValue('Next draft');
  await body.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
  await expect(commitMessage).toHaveValue(
    'Explain the editor change\n\nKeep the authored message.'
  );
  await page.getByRole('button', { name: 'Raise Pull Request', exact: true }).click();
  await expect.poll(() => Boolean(saveEvents)).toBe(true);
  assert.equal(saves[0].markdown, 'Next draft');
  assert.equal(saves[0].commitMessage, 'Explain the editor change\n\nKeep the authored message.');
  console.log(
    'PASS: Source message defaults, scrollable controls and exact author message across editor modes.'
  );
  await back();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  saveEvents.end('id: 1\nevent: done\ndata: {"status":"SUCCESS","message":"saved locally"}\n\n');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('[data-state="saved"]')).toBeVisible();
  await back();
  await expect(page.getByRole('link', { name: 'Edit page', exact: true })).toBeVisible();
  await expect(guard).toHaveCount(0);
  console.log('PASS: Pending-save guard and completed-save navigation.');

  // Create mode has the same guard, while its mode switches stay in place.
  await page.getByRole('link', { name: 'Create page', exact: true }).click();
  await expect(body).toBeVisible();
  // The editor upgrades its splitter after the first paint, remounting inputs.
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
  await body.fill('New draft');
  await page.getByLabel('Visual editor (WYSIWYG)', { exact: true }).click();
  await expect(page.locator('[contenteditable="true"]')).toBeVisible();
  await expect(guard).toHaveCount(0);
  await page.getByLabel('Source editor (raw markdown)', { exact: true }).click();
  await expect(body).toHaveValue('New draft');
  await back();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('link', { name: 'Edit page', exact: true })).toBeVisible();
  await forward();
  await expect(body).toBeVisible();
  // Leave a clean editor to create a forward destination, then edit after Back.
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Edit page', exact: true })).toBeVisible();
  await back();
  await body.fill('Forward draft');
  await browserTraversal('forward');
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(body).toHaveValue('Forward draft');
  await forward();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('link', { name: 'Edit page', exact: true })).toBeVisible();
  console.log(
    'PASS: Back/Forward Keep/Discard, repeated guards, pending/completed saves, create mode and clean navigation.'
  );
} catch (error) {
  console.error(serverOutput);
  if (page)
    console.error(
      'Browser state at failure:',
      await page.evaluate(() => ({
        url: location.href,
        body: document.querySelector('[aria-label="Markdown source editor"]')?.value,
        historyIndex: window.navigation?.currentEntry?.index
      }))
    );
  throw error;
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
  }
  content.closeAllConnections();
  await new Promise(resolve => content.close(resolve));
}
