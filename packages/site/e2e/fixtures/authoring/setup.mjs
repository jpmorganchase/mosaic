import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Run from packages/site. Only overwrite this fixture's known files.
const root = path.resolve('.tmp/authoring-snapshot');
await mkdir(path.join(root, 'docs'), { recursive: true });
const snapshotId = randomUUID();
const files = {
  'docs/index.mdx':
    '---\ntitle: Authoring fixture\nroute: /docs/index\nfullPath: /docs/index.mdx\nlayout: DetailOverview\nbreadcrumbs: []\nsidebarData: []\ntableOfContents: []\n---\n# Authoring fixture\n\nA writable snapshot document.\n',
  'docs/shared-config.json': JSON.stringify({
    config: {
      sourceCapabilities: { writable: true },
      header: { title: 'Authoring fixture', homeLink: '/docs/index', menu: [] }
    }
  }),
  'mosaic-routes.json': JSON.stringify({
    version: 1,
    snapshotId,
    routes: [
      { pathname: '/docs', sourcePathname: '/docs/index.mdx' },
      { pathname: '/docs/index', sourcePathname: '/docs/index.mdx' }
    ]
  }),
  'mosaic-snapshot.json': JSON.stringify({ version: 1, id: snapshotId }),
  'sitemap.xml':
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:3200/docs/index</loc></url></urlset>',
  'mosaic-new-page-sources.json': JSON.stringify({
    version: 1,
    sources: [{ prefixDir: 'docs', writable: true }]
  })
};
await Promise.all(
  Object.entries(files).map(([name, text]) => writeFile(path.join(root, name), text))
);
