import { createHash } from 'node:crypto';
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
const sha256 = (content: string) => createHash('sha256').update(content).digest('hex');

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

  test('writes encoded Markdown pathnames to their literal public filenames', async () => {
    const options = { scopes: [{ path: '/salt' }] };
    const site = await populatedFixture(options);
    await site.update('percent', {
      '/salt/release%20notes.mdx': document('/salt/release%20notes', 'Literal percent'),
      '/salt/backing.mdx': document('/salt/release%20notes', 'Authored permalink', {
        fullPath: '/salt/backing.mdx'
      })
    });
    const files: Record<string, string> = await site.publish(options);
    for (const [route, content] of Object.entries(files)) {
      const target = join(snapshotDir, route.slice(1));
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, content);
    }
    sync();
    expect(read('salt/release%20notes.md')).toContain('Literal percent');
    expect(read('salt/release notes.md')).toContain('Authored permalink');
    expect(read('salt/llms.txt')).toContain('[Literal percent](/salt/release%2520notes.md)');
    expect(read('salt/llms.txt')).toContain('[Authored permalink](/salt/release%20notes.md)');
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

  test('normalizes legacy trailing slashes and omits collisions without resurrecting folder aliases', () => {
    pages({
      '/docs/guide/': '# Guide',
      '/docs/clash': '# First',
      '/docs/clash/': '# Second',
      '/docs/clash/index': '# Index'
    });
    sync();
    expect(read('docs/guide.md')).toBe('# Guide');
    expect(read('docs/guide/.md')).toBe('# Guide');
    expect(existsSync(join(publicDir, 'docs/clash.md'))).toBe(false);
    expect(read('docs/clash/index.md')).toBe('# Index');
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

  test('preserves authored replacements of generated Markdown across builds and server startup', () => {
    pages({ '/guide': '# Snapshot', '/docs': '# Docs' });
    sync();
    writeFileSync(join(publicDir, 'guide.md'), '# Handwritten replacement');

    pages({ '/guide': '# Updated snapshot', '/docs': '# Updated docs' });
    sync();
    expect(read('guide.md')).toBe('# Handwritten replacement');
    expect(read('docs.md')).toBe('# Updated docs');

    syncSnapshotAssets({ snapshotDir, publicDir, manifestFile, copyMarkdown: false });
    expect(read('guide.md')).toBe('# Handwritten replacement');
    expect(existsSync(join(publicDir, 'docs.md'))).toBe(false);
  });

  describe('with a path-only manifest from an earlier build', () => {
    // Those builds overwrote every listed copy, so each one is still generated.
    const legacy = {
      'guide.md': '# Old guide',
      'docs.md': '# Docs',
      'deleted.md': '# Deleted page',
      'excluded.md': '# Now excluded',
      'docs/nested/index.md': '# Nested',
      'docs/nested.md': '# Nested'
    };
    const manifest = () => JSON.parse(readFileSync(manifestFile, 'utf8'));

    beforeEach(() => {
      mkdirSync(join(publicDir, 'docs/nested'), { recursive: true });
      for (const [file, content] of Object.entries(legacy))
        writeFileSync(join(publicDir, file), content);
      writeFileSync(join(publicDir, 'authored.md'), '# Authored');
      writeFileSync(
        manifestFile,
        JSON.stringify({ version: 1, files: Object.keys(legacy).sort() })
      );
      // The guide was edited; the deleted page, excluded page and nested folder are gone.
      pages({ '/guide': '# Updated guide', '/docs': '# Docs', '/added': '# Added' });
    });

    test('a static export replaces edited copies and removes deleted or excluded pages', () => {
      sync();

      expect(read('guide.md')).toBe('# Updated guide');
      expect(read('docs.md')).toBe('# Docs');
      expect(read('added.md')).toBe('# Added');
      for (const file of ['deleted.md', 'excluded.md', 'docs/nested/index.md', 'docs/nested.md'])
        expect(existsSync(join(publicDir, file))).toBe(false);
      expect(read('authored.md')).toBe('# Authored');
      expect(manifest()).toEqual({
        version: 1,
        files: ['added.md', 'docs.md', 'guide.md'],
        markdownHashes: {
          'added.md': sha256('# Added'),
          'docs.md': sha256('# Docs'),
          'guide.md': sha256('# Updated guide')
        }
      });

      // Ownership is tracked by hash from now on.
      writeFileSync(join(publicDir, 'guide.md'), '# Handwritten replacement');
      sync();
      expect(read('guide.md')).toBe('# Handwritten replacement');
      expect(manifest().files).toEqual(['added.md', 'docs.md']);
    });

    test('a snapshot server removes every listed copy, whether or not it matches the snapshot', () => {
      syncSnapshotAssets({ snapshotDir, publicDir, manifestFile, copyMarkdown: false });

      for (const file of Object.keys(legacy)) expect(existsSync(join(publicDir, file))).toBe(false);
      expect(read('authored.md')).toBe('# Authored');
      expect(manifest()).toEqual({ version: 1, files: [], markdownHashes: {} });
    });

    test('an active-mode build or dev server removes every listed copy', () => {
      syncSnapshotAssets({ publicDir, manifestFile });

      for (const file of Object.keys(legacy)) expect(existsSync(join(publicDir, file))).toBe(false);
      expect(read('authored.md')).toBe('# Authored');
      expect(manifest()).toEqual({ version: 1, files: [], markdownHashes: {} });
    });
  });

  test.each([
    ['null', null],
    ['an array of', []],
    ['non-string', { 'guide.md': 1 }]
  ])('rejects %s Markdown hashes', (_, hashes) => {
    writeFileSync(join(publicDir, 'guide.md'), '# Guide');
    writeFileSync(
      manifestFile,
      JSON.stringify({ version: 1, files: ['guide.md'], markdownHashes: hashes })
    );
    expect(sync).toThrow('Invalid public asset manifest');
    expect(read('guide.md')).toBe('# Guide');
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
      JSON.stringify({ version: 3, pages: {} })
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
