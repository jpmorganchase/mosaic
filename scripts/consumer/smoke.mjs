import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
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
console.log(
  'Packed provider browser policies and server parameters, sidebar extensions, and CLI plugin-failure checks passed'
);
