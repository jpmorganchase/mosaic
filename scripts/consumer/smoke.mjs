import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  SearchProvider,
  useSearchContext
} from '@jpmorganchase/mosaic-site-components/SearchProvider';
import { createSearchIndex } from '@jpmorganchase/mosaic-site-middleware/search';
import { buildSidebarTree, compareSidebarNodes } from '@jpmorganchase/mosaic-plugins/sidebar';
import {
  ColorModeProvider,
  initializeStore,
  StoreProvider,
  useColorMode,
  useStoreActions
} from '@jpmorganchase/mosaic-store';

function ThemeConsumer() {
  assert.equal(useColorMode(), 'light');
  assert.equal(typeof useStoreActions().setColorMode, 'function');
  return null;
}
renderToString(
  React.createElement(
    ColorModeProvider,
    null,
    React.createElement(
      StoreProvider,
      { value: initializeStore() },
      React.createElement(ThemeConsumer)
    )
  )
);

const records = Array.from({ length: 24 }, (_, i) =>
  ['examples', 'usage'].map(tab => ({
    id: `/salt/component-${i}/${tab}`,
    route: `/salt/component-${i}/${tab}`,
    title: `Component ${i}`,
    text: 'Choose a color',
    headings: [],
    namespace: 'salt'
  }))
).flat();
const indexOptions = {
  synonyms: [['color', 'colour']],
  groupBy: record => record.route.replace(/\/(examples|usage)$/, ''),
  pageRank: record => (record.route.endsWith('/usage') ? 0 : 1)
};
const queryOptions = { limit: 20, sectionsPerResult: 0 };
const expected = createSearchIndex(records, indexOptions).search('colour', {
  ...queryOptions,
  namespace: 'salt'
});
assert.equal(expected.length, 20);
assert.ok(expected.every(hit => hit.href.endsWith('/usage') && hit.sections.length === 0));
const sharedIndex = createSearchIndex(records, { synonyms: indexOptions.synonyms });
assert.deepEqual(
  sharedIndex.search('colour', {
    ...queryOptions,
    groupBy: indexOptions.groupBy,
    pageRank: indexOptions.pageRank,
    namespace: 'salt'
  }),
  expected
);
assert.equal(sharedIndex.search('colour', { limit: 50 }).length, 48);
function searchContext(props) {
  let context;
  function Capture() {
    context = useSearchContext();
    return null;
  }
  renderToString(React.createElement(SearchProvider, props, React.createElement(Capture)));
  return context;
}
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => Response.json({ version: 1, records });
  const browser = searchContext({ mode: 'browser', indexOptions, queryOptions });
  assert.deepEqual(await browser.search('colour', 'salt'), expected);
  globalThis.window = { location: { href: 'https://salt.test/' } };
  globalThis.fetch = async url => {
    assert.equal(url.searchParams.get('q'), 'colour');
    assert.equal(url.searchParams.get('namespace'), 'salt');
    assert.equal(url.searchParams.get('limit'), '20');
    assert.equal(url.searchParams.get('sections'), '0');
    return Response.json({ results: expected });
  };
  assert.deepEqual(
    await searchContext({ mode: 'server', queryOptions }).search('colour', 'salt'),
    expected
  );
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.window;
}

const page = (route, metadata = {}) => ({
  fullPath: `${route}.mdx`,
  route,
  title: route.split('/').at(-1),
  ...metadata
});
const tree = buildSidebarTree(
  [
    page('/salt/index', { sidebar: { exclude: true } }),
    page('/salt/guides/index', { groupPriority: 1 }),
    page('/salt/components/index', { groupPriority: 10, sidebar: { exclude: true } }),
    page('/salt/components/button/index', { title: 'Button', status: 'Release Candidate' }),
    page('/salt/components/button/zebra'),
    page('/salt/components/button/alpha'),
    page('/salt/components/deep/nested/page')
  ],
  {
    rootDir: '/salt',
    transformPage: (node, source) => ({ ...node, metadata: { status: source.status } }),
    transformGroup: (node, { indexPage }) => ({
      ...node,
      priority: indexPage?.groupPriority ?? node.priority,
      metadata: { status: indexPage?.status }
    }),
    compareNodes: (a, b) => compareSidebarNodes(a, b) || a.name.localeCompare(b.name)
  }
);
assert.equal(tree.childNodes[0].id, '/salt/components');
const button = tree.childNodes[0].childNodes[0];
assert.equal(button.metadata.status, 'Release Candidate');
assert.equal(button.childNodes[0].metadata.status, 'Release Candidate');
assert.deepEqual(
  button.childNodes.map(node => node.id),
  [
    '/salt/components/button/index',
    '/salt/components/button/alpha',
    '/salt/components/button/zebra'
  ]
);
assert.equal(
  tree.childNodes[0].childNodes[1].childNodes[0].childNodes[0].id,
  '/salt/components/deep/nested/page'
);

await fs.mkdir('content', { recursive: true });
await fs.writeFile(
  'content/index.mdx',
  '---\ntitle: Button\nroute: /salt/index\n---\n\n<Custom />\n'
);
await fs.mkdir('other-content', { recursive: true });
await fs.writeFile(
  'other-content/index.mdx',
  '---\ntitle: Other docs\nroute: /other/index\n---\n\nOther namespace content\n'
);
const cli = createRequire(import.meta.url).resolve('@jpmorganchase/mosaic-cli');
for (const failure of ['none', 'markdown', 'main']) {
  const result = spawnSync(
    process.execPath,
    [cli, 'build', '-c', 'mosaic.config.mjs', '-o', 'output', '-n', 'latest'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30_000,
      windowsHide: true,
      env: { ...process.env, MOSAIC_CONSUMER_FAIL: failure }
    }
  );
  const diagnostic = `${result.stdout}\n${result.stderr}`;
  assert.ifError(result.error);
  const identityExists = await fs.access('output/latest/mosaic-snapshot.json').then(
    () => true,
    () => false
  );
  if (failure === 'none') {
    assert.equal(result.status, 0, diagnostic);
    assert.ok(identityExists);
    assert.match(
      await fs.readFile('output/latest/markdown-pages.json', 'utf8'),
      /Converted component/
    );
  } else {
    assert.equal(result.status, 1, diagnostic);
    assert.equal(identityExists, false, diagnostic);
    const summary = diagnostic.slice(
      diagnostic.indexOf('Snapshot failed because plugins recorded errors:')
    );
    assert.match(summary, /Source '.*', plugin '/);
    if (failure === 'markdown') {
      assert.match(summary, /LlmsTxtPlugin.*\(\$beforeSend\)/);
      assert.match(summary, /Deliberate Markdown converter failure/);
    } else {
      assert.match(summary, /failing-plugin.*\(afterUpdate\)/);
      assert.match(summary, /Deliberate main-thread plugin failure/);
    }
  }
}

for (const [scope, expectedRoutes, search] of [
  ['salt', ['/salt/index'], true],
  ['salt,other', ['/other/index', '/salt/index'], true],
  ['salt', ['/salt/index'], false]
]) {
  const result = spawnSync(
    process.execPath,
    [cli, 'build', '-c', 'mosaic.config.mjs', '-o', 'output', '-n', 'scoped', '--scope', scope],
    {
      encoding: 'utf8',
      timeout: 30_000,
      windowsHide: true,
      env: {
        ...process.env,
        MOSAIC_CONSUMER_FAIL: 'none',
        MOSAIC_CONSUMER_SEARCH: search ? 'enabled' : 'disabled'
      }
    }
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const snapshot = 'output/scoped';
  await fs.access(`${snapshot}/mosaic-snapshot.json`);
  const markdown = JSON.parse(await fs.readFile(`${snapshot}/markdown-pages.json`, 'utf8'));
  assert.deepEqual(Object.keys(markdown.pages).sort(), expectedRoutes);
  const sitemap = await fs.readFile(`${snapshot}/sitemap.xml`, 'utf8');
  assert.deepEqual(
    [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => new URL(url).pathname).sort(),
    expectedRoutes
  );
  const llmsIndex = await fs.readFile(`${snapshot}/llms.txt`, 'utf8');
  for (const route of expectedRoutes)
    assert.ok(llmsIndex.includes(`${route}.md`), `llms.txt lacks ${route}`);
  if (scope === 'salt') assert.ok(!llmsIndex.includes('/other/'));
  assert.equal(
    await fs.readFile(`${snapshot}/llms-full.txt`, 'utf8'),
    expectedRoutes.map(route => markdown.pages[route]).join('\n')
  );
  const searchFile = `${snapshot}/search-records.json`;
  if (search) {
    const searchRecords = JSON.parse(await fs.readFile(searchFile, 'utf8'));
    assert.deepEqual(
      [...new Set(searchRecords.records.map(record => record.route))].sort(),
      expectedRoutes
    );
  } else {
    await assert.rejects(fs.access(searchFile), { code: 'ENOENT' });
  }
  for (const route of expectedRoutes) await fs.access(`${snapshot}${route}.mdx`);
  if (scope === 'salt') await assert.rejects(fs.access(`${snapshot}/other`), { code: 'ENOENT' });
}
console.log(
  'Packed provider policies, sidebar extensions, CLI plugin failures and scoped snapshot artifacts passed'
);
