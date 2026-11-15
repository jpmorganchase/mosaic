import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { syncSnapshotAssets } from '../../../scripts/sync-snapshot-assets.cjs';

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
