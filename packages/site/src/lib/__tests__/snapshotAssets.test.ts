import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { syncSnapshotAssets } from '../../../scripts/sync-snapshot-assets.cjs';
import { populatedFixture, document } from '../../../../plugins/src/__tests__/fixtures/llms.mjs';

let root: string;
let snapshotDir: string;
let publicDir: string;
let manifestFile: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mosaic-snapshot-assets-'));
  snapshotDir = join(root, 'snapshot');
  publicDir = join(root, 'public');
  manifestFile = join(root, '.mosaic-public-assets.json');
  mkdirSync(snapshotDir);
  mkdirSync(publicDir);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const pages = (value: Record<string, string>) =>
  writeFileSync(
    join(snapshotDir, 'markdown-pages.json'),
    JSON.stringify({ version: 1, pages: value })
  );
const sync = () => syncSnapshotAssets({ snapshotDir, publicDir, manifestFile });
const read = (file: string) => readFileSync(join(publicDir, file), 'utf8');

describe('snapshot public assets', () => {
  test('exports generated nested indexes and removes retired scopes and pages on the next static build', async () => {
    const options = {
      scopes: [{ path: '/salt' }, { path: '/salt/components' }, { path: '/mosaic' }]
    };
    const site = await populatedFixture(options);
    const save = (files: Record<string, string>) => {
      for (const [route, content] of Object.entries(files)) {
        const target = join(snapshotDir, route.slice(1));
        mkdirSync(join(target, '..'), { recursive: true });
        writeFileSync(target, content);
      }
    };
    const first = await site.publish(options);
    save(first);
    sync();
    expect(read('salt/llms.txt')).toBe(first['/salt/llms.txt']);
    expect(read('salt/components/llms-full.txt')).toBe(first['/salt/components/llms-full.txt']);
    expect(read('salt/components/button.md')).toContain('[/salt/components/llms.txt]');
    expect(existsSync(join(publicDir, 'llms-manifest.json'))).toBe(false);

    await site.update('0', { '/salt/new.mdx': document('/salt/new', 'New') });
    // Reusing snapshotDir leaves old files there, but only the current manifest
    // may select them for the public static export.
    save(await site.publish({ scopes: [{ path: '/salt' }] }));
    sync();
    expect(existsSync(join(publicDir, 'salt/components/llms.txt'))).toBe(false);
    expect(existsSync(join(publicDir, 'mosaic/llms-full.txt'))).toBe(false);
    expect(existsSync(join(publicDir, 'salt/components/button.md'))).toBe(false);
    expect(read('salt/llms-full.txt')).toContain('New');
    syncSnapshotAssets({ publicDir, manifestFile });
    expect(existsSync(join(publicDir, 'salt/llms.txt'))).toBe(false);
  });

  test('rejects an authored file at a reserved scoped index without changing it', () => {
    mkdirSync(join(snapshotDir, 'salt'));
    mkdirSync(join(publicDir, 'salt'));
    writeFileSync(
      join(snapshotDir, 'llms-manifest.json'),
      JSON.stringify({ version: 1, scopes: ['/salt'] })
    );
    writeFileSync(join(snapshotDir, 'salt/llms.txt'), '# Generated');
    writeFileSync(join(snapshotDir, 'salt/llms-full.txt'), '# Corpus');
    writeFileSync(join(publicDir, 'salt/llms.txt'), '# Authored');
    expect(sync).toThrow('Reserved LLM route collides');
    expect(read('salt/llms.txt')).toBe('# Authored');
  });

  test.each(['/../outside', '//outside', '/salt/../../outside', '/salt\\outside', '/salt/%2e%2e'])(
    'rejects unsafe scope %s before copying static files',
    scope => {
      writeFileSync(
        join(snapshotDir, 'llms-manifest.json'),
        JSON.stringify({ version: 1, scopes: [scope] })
      );
      expect(sync).toThrow('Invalid LLM manifest');
    }
  );

  test('removes retired search outputs recorded by a previous build', () => {
    const legacy = ['search-data.json', 'search-data-condensed.json', 'search-config.json'];
    for (const file of legacy) {
      writeFileSync(join(publicDir, file), 'Old generated search');
      writeFileSync(join(snapshotDir, file), 'Old snapshot search');
    }
    writeFileSync(manifestFile, JSON.stringify({ version: 1, files: legacy }));
    writeFileSync(join(snapshotDir, 'search-records.json'), '{"version":1,"records":[]}');
    sync();
    for (const file of legacy) expect(existsSync(join(publicDir, file))).toBe(false);
    expect(read('search-records.json')).toBe('{"version":1,"records":[]}');
  });

  test('removes deleted or excluded pages and folder aliases on the next build', () => {
    writeFileSync(join(publicDir, 'authored.md'), 'A manually maintained public file');
    pages({ '/docs/removed/index': '# Old content', '/docs/kept': '# Kept' });
    sync();
    expect(read('docs/removed.md')).toBe('# Old content');

    pages({ '/docs/kept': '# Updated' });
    sync();

    expect(existsSync(join(publicDir, 'docs/removed/index.md'))).toBe(false);
    expect(existsSync(join(publicDir, 'docs/removed.md'))).toBe(false);
    expect(read('docs/kept.md')).toBe('# Updated');
    expect(read('authored.md')).toBe('A manually maintained public file');
  });

  test('removes generated files when their plugins no longer produce output', () => {
    for (const file of ['search-records.json', 'llms.txt', 'llms-full.txt']) {
      writeFileSync(join(snapshotDir, file), file);
    }
    pages({ '/docs/index': '# Docs' });
    sync();
    expect(read('llms.txt')).toBe('llms.txt');

    rmSync(snapshotDir, { recursive: true });
    mkdirSync(snapshotDir);
    sync();

    for (const file of [
      'search-records.json',
      'llms.txt',
      'llms-full.txt',
      'docs.md',
      'docs/index.md'
    ]) {
      expect(existsSync(join(publicDir, file))).toBe(false);
    }
  });

  test('keeps explicit pages ahead of folder aliases, including empty pages', () => {
    pages({ '/docs/guide': '', '/docs/guide/index': '# Index' });
    sync();
    expect(read('docs/guide.md')).toBe('');
    expect(read('docs/guide/index.md')).toBe('# Index');
  });

  test('exports root Markdown separately from an explicit /index page', () => {
    pages({ '/': '# Home', '/index': '# Index' });
    sync();
    expect(read('.md')).toBe('# Home');
    expect(read('index.md')).toBe('# Index');
  });

  test('switching to a snapshot server removes generated Markdown but preserves authored assets', () => {
    writeFileSync(join(publicDir, 'authored.md'), '# Authored');
    pages({ '/': '# Home', '/docs/index': '# Snapshot' });
    sync();
    expect(read('docs/index.md')).toBe('# Snapshot');

    syncSnapshotAssets({ snapshotDir, publicDir, manifestFile, copyMarkdown: false });

    for (const file of ['.md', 'docs/index.md', 'docs.md'])
      expect(existsSync(join(publicDir, file))).toBe(false);
    expect(read('authored.md')).toBe('# Authored');
    expect(JSON.parse(readFileSync(manifestFile, 'utf8')).files).toEqual([]);
  });

  test('clears snapshot copies for an active-mode build without removing authored assets', () => {
    writeFileSync(join(publicDir, 'authored.md'), '# Authored');
    pages({ '/docs/index': '# Snapshot' });
    sync();

    syncSnapshotAssets({ publicDir, manifestFile });

    expect(existsSync(join(publicDir, 'docs/index.md'))).toBe(false);
    expect(existsSync(join(publicDir, 'docs.md'))).toBe(false);
    expect(read('authored.md')).toBe('# Authored');
  });

  test('leaves the previous output intact if the new Markdown bundle is invalid', () => {
    pages({ '/docs/index': '# Last successful build' });
    sync();
    writeFileSync(
      join(snapshotDir, 'markdown-pages.json'),
      JSON.stringify({ version: 2, pages: {} })
    );

    expect(sync).toThrow('Invalid Markdown pages');
    expect(read('docs/index.md')).toBe('# Last successful build');
  });

  test('does not write outside public or remove paths outside it from a manifest', () => {
    pages({ '/../../outside': '# Invalid', '/docs/index': '# Valid' });
    sync();
    expect(existsSync(join(root, 'outside.md'))).toBe(false);
    expect(read('docs/index.md')).toBe('# Valid');

    writeFileSync(join(root, 'outside.md'), '# Keep');
    writeFileSync(manifestFile, JSON.stringify({ version: 1, files: ['../outside.md'] }));
    expect(sync).toThrow('Invalid public asset manifest');
    expect(readFileSync(join(root, 'outside.md'), 'utf8')).toBe('# Keep');
  });
});
