import { test, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Integration test for `yarn build:static:file` output.
 *
 * Runs against a previously-built `out/` directory at the package
 * root. Skipped automatically when `out/` is absent so the unit suite
 * stays green for developers who haven't built statically.
 *
 * Lock-in guarantees:
 *  1. The four canonical artefacts exist and are non-empty
 *     (`index.html`, `mosaic/index.html`, `robots.txt`, `sitemap.xml`).
 *  2. No `next-mdx-remote` blob is shipped in the static output —
 *     this is the headline outcome of the App Router migration's MDX
 *     work.
 *  3. The route-stub apply/revert script left no `.bak` files behind
 *     (a regression here would leak stub route handlers into git on a
 *     failed build).
 *  4. The catch-all route emitted multiple pre-rendered pages, not
 *     just a single dynamic fallback.
 */

const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'site', 'out');

const hasOutDir = fs.existsSync(OUT_DIR);
const itStaticExport = hasOutDir ? test : test.skip;

itStaticExport('static export emits the canonical artefacts', () => {
  for (const rel of ['index.html', 'mosaic/index.html', 'robots.txt', 'sitemap.xml']) {
    const full = path.join(OUT_DIR, rel);
    expect(fs.existsSync(full), `missing artefact: ${rel}`).toBe(true);
    expect(fs.statSync(full).size, `empty artefact: ${rel}`).toBeGreaterThan(0);
  }
});

itStaticExport('static export does not ship next-mdx-remote', () => {
  // Walk every .html / .js / .json file under out/ and assert that none
  // mention `next-mdx-remote` (the legacy MDX runtime). The
  // `next-mdx-remote-client` editor entry is intentionally NOT in this
  // build because the editor lives behind `next/dynamic({ ssr: false })`
  // and is excluded from the static export.
  const offenders: string[] = [];
  walk(OUT_DIR, full => {
    if (!/\.(html|js|json)$/.test(full)) return;
    const contents = fs.readFileSync(full, 'utf8');
    if (/next-mdx-remote"/.test(contents) || /next-mdx-remote\//.test(contents)) {
      offenders.push(path.relative(OUT_DIR, full));
    }
  });
  expect(offenders, `next-mdx-remote leaked into:\n${offenders.join('\n')}`).toEqual([]);
});

itStaticExport('route-stub script left no .bak files behind', () => {
  // Limit the scan to where the stub script operates
  // (`packages/site/src/app/api`) so we don't walk node_modules.
  const apiDir = path.resolve(__dirname, '..', '..', '..', 'site', 'src', 'app', 'api');
  const baks: string[] = [];
  walk(apiDir, full => {
    if (full.endsWith('.bak')) baks.push(path.relative(apiDir, full));
  });
  expect(baks, `route stubs were not reverted:\n${baks.join('\n')}`).toEqual([]);
});

itStaticExport('catch-all emitted many pre-rendered pages', () => {
  // Count .html files under the canonical mosaic content namespace.
  let count = 0;
  walk(path.join(OUT_DIR, 'mosaic'), full => {
    if (full.endsWith('.html')) count++;
  });
  // The reference snapshot ships ~80+ pages; insist on at least 20 so a
  // future content trim doesn't accidentally flatten the suite.
  expect(count).toBeGreaterThanOrEqual(20);
});

function walk(dir: string, visit: (full: string) => void) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}
