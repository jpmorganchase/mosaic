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

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-raw-test-'));
  fs.mkdirSync(path.join(tmpDir, 'getting-started'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'getting-started', 'index.mdx'), FIXTURE_BODY);
  fs.writeFileSync(path.join(tmpDir, 'config.json'), '{"k":1}');

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
          rootDir: '/ignored',
          repo: 'x',
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

  test('returns 404 + unsupported-source header for a git-repo URL', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/_mosaic-raw/docs/some-page.mdx'
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-mosaic-raw-status']).toBe('unsupported-source');
    expect(response.headers['x-mosaic-raw-module']).toBe('@jpmorganchase/mosaic-source-git-repo');
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
