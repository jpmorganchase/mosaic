/**
 * End-to-end test for the `/_mosaic-raw/*` route in the
 * Mosaic CLI's Fastify server.
 *
 * Verifies the integration between the route handler and the
 * resolver (which has its own unit tests in
 * `resolveRawSourcePath.test.ts`) by spinning up a real Fastify
 * server pointed at a real temp directory. The resolver tests
 * cover URL-matching corner cases exhaustively; this file
 * focuses on the HTTP-shaped behaviours that only a live
 * server exercises: status codes, headers, byte fidelity,
 * Fastify's URL parsing, and the route's ordering relative to
 * the catch-all `/*` route.
 *
 * We deliberately do NOT reuse `serve.test.ts`'s
 * `vi.mock('@jpmorganchase/mosaic-core')` pattern: the raw
 * route reads from disk via `node:fs`, not from the mocked
 * union volume, so mocking core would hide rather than
 * exercise the path we care about.
 */
import { describe, expect, test, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { MosaicConfig } from '@jpmorganchase/mosaic-types';

import { getWorktreeDir } from '@jpmorganchase/mosaic-source-git-repo';
import fastifyMosaic from '../plugins/mosaicFastifyPlugin';

// Mock MosaicCore so we don't actually pull content / start
// workers — the raw route doesn't use the core at all, but the
// plugin's `decorate` call needs *something* shaped like a
// MosaicCore. A minimal stub is enough.
vi.mock('@jpmorganchase/mosaic-core', () => ({
  default: vi.fn().mockImplementation(function MosaicCoreMock() {
    return {
      filesystem: {
        promises: {
          // The catch-all `/*` route hits these; returning
          // `false` makes it 404 for every URL that *isn't*
          // intercepted by the raw route. That gives us a
          // clean way to confirm the raw route wins.
          exists: vi.fn().mockResolvedValue(false),
          stat: vi.fn(),
          realpath: vi.fn(),
          readFile: vi.fn()
        }
      }
    };
  })
}));

let tmpDir: string;
let server: ReturnType<typeof Fastify>;

const FIXTURE_BODY = '---\ntitle: Raw\n---\n# Hello\n';
const GIT_FIXTURE_BODY = '---\ntitle: Git Raw\n---\n# From the worktree\n';

// Real-shaped git URL so `getWorktreeDir` can parse it. The
// derived worktree path is relative to `process.cwd()`, so we
// seed a fixture under that path before the server boots so the
// route can read real bytes back.
const FIXTURE_REPO_URL = 'https://example.com/proj/raw-route-test-docs.git';
const FIXTURE_REPO_BRANCH = 'main';
const FIXTURE_REPO_SUBFOLDER = 'docs';

let gitWorktreeFixtureDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-raw-test-'));
  fs.mkdirSync(path.join(tmpDir, 'getting-started'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'getting-started', 'index.mdx'), FIXTURE_BODY);
  fs.writeFileSync(path.join(tmpDir, 'config.json'), '{"k":1}');

  // Seed a fixture inside the *exact* directory the git-repo
  // resolver will compute via `getWorktreeDir`. We resolve the
  // path here (not in `getWorktreeDir`) so the test stays
  // self-contained: same formula, same cwd, same answer the
  // resolver will produce when the route handler runs.
  gitWorktreeFixtureDir = path.join(
    getWorktreeDir(FIXTURE_REPO_URL, FIXTURE_REPO_BRANCH),
    FIXTURE_REPO_SUBFOLDER
  );
  fs.mkdirSync(path.join(gitWorktreeFixtureDir, 'some-page'), { recursive: true });
  fs.writeFileSync(
    path.join(gitWorktreeFixtureDir, 'some-page', 'index.mdx'),
    GIT_FIXTURE_BODY
  );

  const config: MosaicConfig = {
    pageExtensions: ['.mdx', '.json'],
    ignorePages: [],
    serialisers: [],
    plugins: [],
    enableSourcePush: false,
    schedule: { checkIntervalMins: 60, initialDelayMs: 1000 },
    sources: [
      {
        modulePath: '@jpmorganchase/mosaic-source-local-folder',
        namespace: 'mosaic',
        options: {
          rootDir: tmpDir,
          prefixDir: 'mosaic',
          extensions: ['.mdx']
        }
      },
      {
        modulePath: '@jpmorganchase/mosaic-source-git-repo',
        namespace: 'docs',
        options: {
          prefixDir: 'docs',
          repo: FIXTURE_REPO_URL,
          branch: FIXTURE_REPO_BRANCH,
          remote: 'origin',
          subfolder: FIXTURE_REPO_SUBFOLDER,
          extensions: ['.mdx'],
          credentials: 'x:y'
        }
      },
      // A second git-repo source with a deliberately malformed
      // `repo` URL — the resolver swallows the parse failure
      // and falls through to "no match", so this source
      // shouldn't break sibling lookups.
      {
        modulePath: '@jpmorganchase/mosaic-source-git-repo',
        namespace: 'broken-git',
        options: {
          prefixDir: 'broken-git',
          repo: 'not-a-url',
          branch: 'main',
          remote: 'origin',
          subfolder: 'docs',
          extensions: ['.mdx'],
          credentials: 'x:y'
        }
      }
    ]
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MosaicCore = (await import('@jpmorganchase/mosaic-core')).default as any;
  server = Fastify({ logger: false });
  await server.register(fastifyMosaic, {
    config,
    mosaic: new MosaicCore(config)
  });
  await server.ready();
});

afterAll(async () => {
  await server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Tear down the git-repo fixture too — the clone-root
  // (`<cwd>/.tmp/.cloned_docs/<project>/<repo>`) is two levels
  // above the worktree dir; remove the whole project subtree
  // so we don't leave stray `<cwd>/.tmp/.cloned_docs/proj/...`
  // dirs behind between test runs.
  const cloneRoot = path.dirname(path.dirname(gitWorktreeFixtureDir));
  fs.rmSync(cloneRoot, { recursive: true, force: true });
});

describe('GET /_mosaic-raw/*', () => {
  test('returns the raw on-disk bytes for a local-folder source', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/mosaic/getting-started/index.mdx'
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/mdx');
    // Namespace header lets future debug UIs trace which source
    // served the bytes — assert it so a refactor doesn't drop
    // the header silently.
    expect(response.headers['x-mosaic-raw-namespace']).toBe('mosaic');
    expect(response.payload).toBe(FIXTURE_BODY);
  });

  test('sets application/json for .json fixtures', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/mosaic/config.json'
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json');
    expect(response.payload).toBe('{"k":1}');
  });

  test('returns the raw on-disk bytes for a git-repo source via the derived worktree path', async () => {
    // The resolver computes the worktree path with the same
    // `(repo, branch)` formula the source's worker uses, joins
    // it with `subfolder`, then resolves the URL's remaining
    // segments under that. Reading back the fixture we wrote
    // in `beforeAll` proves the parent CLI process can serve
    // raw bytes for a git-repo URL without any IPC into the
    // worker.
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/docs/some-page/index.mdx'
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/mdx');
    expect(response.headers['x-mosaic-raw-namespace']).toBe('docs');
    expect(response.payload).toBe(GIT_FIXTURE_BODY);
  });

  test('returns 404 (no headers) for a git-repo URL whose file is missing on disk', async () => {
    // Common in dev: the source worker hasn't finished its
    // initial clone yet, or the file was just renamed. We map
    // ENOENT to a plain 404 so the editor's
    // `MdxRawSourceResult` reads it as `not-found` and shows a
    // "the source file couldn't be found" banner — the same
    // recoverable path as a mid-rename race on a local-folder
    // source.
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/docs/missing-page.mdx'
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-mosaic-raw-status']).toBeUndefined();
  });

  test('falls through to no-matching-source when a git-repo source has a malformed `repo` URL', async () => {
    // The malformed-repo source is registered with prefix
    // `broken-git` — it should fall through to "no match"
    // rather than 500 the route, so the editor still gets a
    // useful discriminator and sibling sources keep working.
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/broken-git/page.mdx'
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-mosaic-raw-status']).toBe('no-matching-source');
  });

  test('returns 404 + no-matching-source for a URL no source claims', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/unknown/page.mdx'
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-mosaic-raw-status']).toBe('no-matching-source');
  });

  test('returns 404 when the resolved file does not exist on disk', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/mosaic/does-not-exist.mdx'
    });
    expect(response.statusCode).toBe(404);
  });

  test('does not collide with the general /* route', async () => {
    // The catch-all route mocks `exists` as false, so a plain
    // URL with no raw prefix should 404 with no `X-Mosaic-Raw-*`
    // headers. This guards against accidentally moving the raw
    // route below the catch-all in a future refactor (which
    // would make raw URLs go through the union-volume lookup
    // first and hit a misleading 404).
    const response = await server.inject({
      method: 'GET',
      url: '/mosaic/getting-started/index.mdx'
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-mosaic-raw-status']).toBeUndefined();
  });
});
