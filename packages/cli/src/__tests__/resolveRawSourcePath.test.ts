/**
 * Unit tests for `resolveRawSourcePath`.
 *
 * The resolver is the pure piece of the new `/_mosaic-raw/*`
 * route — given a URL and a list of source definitions, decide
 * which (if any) raw on-disk file it maps to. By covering it in
 * isolation we can exhaust the URL-matching corner cases
 * (prefixed vs. unprefixed sources, ordering, `..` escapes,
 * unsupported source kinds) without spinning up Fastify on every
 * case. The Fastify-level test in `serve.test.ts` then only has
 * to verify the route plumbing once.
 */
import { describe, expect, test } from 'vitest';
import path from 'node:path';
import type { SourceModuleDefinition } from '@jpmorganchase/mosaic-types';

import {
  KNOWN_RAW_UNSUPPORTED_MODULES,
  resolveRawSourcePath
} from '../plugins/resolveRawSourcePath';
import { getWorktreeDir } from '@jpmorganchase/mosaic-source-git-repo';

const LOCAL: SourceModuleDefinition = {
  modulePath: '@jpmorganchase/mosaic-source-local-folder',
  namespace: 'mosaic',
  options: {
    rootDir: '/abs/content',
    prefixDir: 'mosaic',
    extensions: ['.mdx']
  }
};

const LOCAL_NO_PREFIX: SourceModuleDefinition = {
  modulePath: '@jpmorganchase/mosaic-source-local-folder',
  namespace: 'root',
  options: {
    rootDir: '/abs/root-content',
    extensions: ['.mdx']
  }
};

const HTTP: SourceModuleDefinition = {
  modulePath: '@jpmorganchase/mosaic-source-http',
  namespace: 'http',
  options: {
    prefixDir: 'http-docs',
    extensions: ['.mdx']
  }
};

const GIT: SourceModuleDefinition = {
  modulePath: '@jpmorganchase/mosaic-source-git-repo',
  namespace: 'docs',
  options: {
    repo: 'https://bitbucket.example.com/scm/proj/my-docs.git',
    branch: 'main',
    remote: 'origin',
    credentials: 'user:token',
    subfolder: 'docs',
    prefixDir: 'docs',
    extensions: ['.mdx']
  }
};

describe('resolveRawSourcePath', () => {
  test('resolves a prefixed URL to <rootDir>/<rest>', () => {
    const result = resolveRawSourcePath('/mosaic/getting-started/index.mdx', [LOCAL]);
    expect(result).toEqual({
      kind: 'resolved',
      filePath: path.resolve('/abs/content', 'getting-started/index.mdx'),
      namespace: 'mosaic'
    });
  });

  test('resolves an unprefixed source when the URL has no matching prefix', () => {
    const result = resolveRawSourcePath('/topic/page.mdx', [LOCAL_NO_PREFIX]);
    expect(result).toEqual({
      kind: 'resolved',
      filePath: path.resolve('/abs/root-content', 'topic/page.mdx'),
      namespace: 'root'
    });
  });

  test('prefers a prefixed source over an unprefixed one when both could claim the URL', () => {
    // `LOCAL_NO_PREFIX` would claim any URL; `LOCAL` is the more
    // specific match. The ordering rule in the resolver is the
    // safety net for configs that list the unprefixed source
    // first (which would otherwise win declaration-order).
    const result = resolveRawSourcePath('/mosaic/index.mdx', [LOCAL_NO_PREFIX, LOCAL]);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.namespace).toBe('mosaic');
    }
  });

  test('returns no-matching-source when no source claims the URL', () => {
    const result = resolveRawSourcePath('/unknown/page.mdx', [LOCAL]);
    expect(result).toEqual({ kind: 'no-matching-source', url: '/unknown/page.mdx' });
  });

  test('returns unsupported-source when the matching source is not local-folder or git-repo', () => {
    const result = resolveRawSourcePath('/http-docs/page.mdx', [HTTP]);
    expect(result).toEqual({
      kind: 'unsupported-source',
      modulePath: '@jpmorganchase/mosaic-source-http',
      namespace: 'http'
    });
  });

  test('resolves a git-repo URL to <worktreeDir>/<subfolder>/<rest>', () => {
    // The resolver derives the worktree path from `(repo, branch)`
    // via the source-git-repo helper — same formula the source's
    // worker uses, so no IPC is required.
    const result = resolveRawSourcePath('/docs/getting-started/index.mdx', [GIT]);
    const expectedRoot = path.join(
      getWorktreeDir(
        'https://bitbucket.example.com/scm/proj/my-docs.git',
        'main'
      ),
      'docs'
    );
    expect(result).toEqual({
      kind: 'resolved',
      filePath: path.resolve(expectedRoot, 'getting-started/index.mdx'),
      namespace: 'docs'
    });
  });

  test('git-repo: refuses to read above the worktree subfolder via `..`', () => {
    const result = resolveRawSourcePath('/docs/../../escape.mdx', [GIT]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('git-repo: falls through to no-match when options are incomplete', () => {
    const incomplete: SourceModuleDefinition = {
      modulePath: '@jpmorganchase/mosaic-source-git-repo',
      namespace: 'broken',
      options: {
        // missing `repo` and `branch`
        prefixDir: 'docs',
        subfolder: 'docs',
        extensions: ['.mdx']
      }
    };
    const result = resolveRawSourcePath('/docs/index.mdx', [incomplete]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('skips disabled sources', () => {
    const disabled: SourceModuleDefinition = { ...LOCAL, disabled: true };
    const result = resolveRawSourcePath('/mosaic/index.mdx', [disabled]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('refuses to read above rootDir via `..` segments', () => {
    // A surviving `..` in the URL would, naively, let a caller
    // read `/abs/secrets` instead of staying within `/abs/content`.
    // The resolver's post-resolution containment check turns this
    // into a no-match rather than a successful path leak.
    const result = resolveRawSourcePath('/mosaic/../secrets.mdx', [LOCAL]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('treats a request that matches a prefix exactly (no trailing rest) as no-match', () => {
    // `/mosaic` alone has no file behind it; only `/mosaic/<x>`
    // resolves. Without the explicit empty-rest guard, the
    // resolver would try to read `<rootDir>` itself, which is a
    // directory and not a page.
    const result = resolveRawSourcePath('/mosaic', [LOCAL]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('normalises double slashes and trailing slashes before matching', () => {
    const result = resolveRawSourcePath('//mosaic//getting-started/index.mdx/', [LOCAL]);
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.filePath).toBe(path.resolve('/abs/content', 'getting-started/index.mdx'));
    }
  });

  test('ignores a misconfigured local-folder source missing rootDir', () => {
    const broken: SourceModuleDefinition = {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'broken',
      options: { prefixDir: 'mosaic', extensions: ['.mdx'] }
    };
    // Falls through to no-match rather than throwing — a bad
    // config shouldn't blow up the route for other sources.
    const result = resolveRawSourcePath('/mosaic/index.mdx', [broken]);
    expect(result.kind).toBe('no-matching-source');
  });

  test('exposes the catalogue of known-unsupported modules for diagnostics', () => {
    // `source-git-repo` is intentionally absent — it now resolves
    // to the worker's worktree directory. The catalogue covers
    // the source kinds for which on-disk raw bytes either don't
    // exist (figma, storybook) or require more design work to
    // fetch (http, readme).
    expect(KNOWN_RAW_UNSUPPORTED_MODULES.has('@jpmorganchase/mosaic-source-http')).toBe(true);
    expect(KNOWN_RAW_UNSUPPORTED_MODULES.has('@jpmorganchase/mosaic-source-figma')).toBe(true);
    expect(KNOWN_RAW_UNSUPPORTED_MODULES.has('@jpmorganchase/mosaic-source-storybook')).toBe(true);
    expect(KNOWN_RAW_UNSUPPORTED_MODULES.has('@jpmorganchase/mosaic-source-readme')).toBe(true);
    expect(KNOWN_RAW_UNSUPPORTED_MODULES.has('@jpmorganchase/mosaic-source-git-repo')).toBe(false);
  });
});




