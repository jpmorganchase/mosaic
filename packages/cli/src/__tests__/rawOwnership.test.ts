import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import Fastify from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Volume } from 'memfs';
import PullDocs from '../../../core/src/PullDocs.js';
import SourceManager from '../../../core/src/SourceManager.js';
import FileAccess from '../../../core/src/filesystems/FileAccess.js';
import MutableVolume from '../../../core/src/filesystems/MutableVolume.js';
import fastifyMosaic from '../plugins/mosaicFastifyPlugin.js';

vi.mock('../../../core/src/SourceManager.js');
let root: string;
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-owner-'));
  for (const name of ['a', 'b']) {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, 'page.mdx'), `authored ${name}`);
    fs.writeFileSync(path.join(root, name, 'space name.mdx'), `space ${name}`);
    fs.writeFileSync(path.join(root, name, 'metadata.json'), JSON.stringify({ owner: name }));
  }
  fs.writeFileSync(path.join(root, 'a', 'private.mdx'), 'only a');
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

async function createServer(order: string[], scope?: string[]) {
  const sources = ['a', 'b'].map(namespace => ({
    namespace,
    modulePath: '@jpmorganchase/mosaic-source-local-folder',
    options: { prefixDir: 'shared', rootDir: path.join(root, namespace), extensions: ['.mdx'] }
  }));
  const config = {
    sources,
    plugins: [],
    serialisers: [],
    ignorePages: [],
    pageExtensions: ['.mdx']
  };
  const mosaic = new PullDocs(config as never);
  for (const namespace of order) {
    const files: Record<string, string> = {
      '/shared/page.mdx': `processed ${namespace}`,
      '/shared/space name.mdx': `processed space ${namespace}`
    };
    if (namespace === 'a') files['/shared/private.mdx'] = 'only a';
    const filesystem = new MutableVolume(new FileAccess(Volume.fromJSON(files)), namespace);
    vi.mocked(SourceManager.prototype.addSource).mockResolvedValueOnce({
      filesystem,
      onError: vi.fn(),
      onExit: vi.fn()
    } as never);
    await mosaic.addSource(sources.find(source => source.namespace === namespace)!);
  }
  const server = Fastify();
  await server.register(fastifyMosaic, { config: config as never, mosaic, scope });
  return server;
}

describe('raw source ownership', () => {
  test.each([
    ['a', 'b'],
    ['b', 'a']
  ])('follows mounted order %s then %s', async (first, last) => {
    const server = await createServer([first, last]);
    try {
      expect((await server.inject('/shared/page.mdx')).body).toBe(`processed ${last}`);
      const raw = await server.inject('/_mosaic-raw/shared/page.mdx');
      expect(raw.statusCode).toBe(200);
      expect(raw.body).toBe(`authored ${last}`);
      expect(raw.headers['x-mosaic-raw-namespace']).toBe(last);
      const encoded = await server.inject('/_mosaic-raw/shared/space%20name.mdx?preview=1');
      expect(encoded.statusCode).toBe(200);
      expect(encoded.body).toBe(`space ${last}`);
      expect(encoded.headers['x-mosaic-raw-namespace']).toBe(last);
    } finally {
      await server.close();
    }
  });

  test('excludes out-of-scope owners while preserving unpublished raw JSON', async () => {
    const server = await createServer(['b', 'a'], ['b']);
    try {
      expect((await server.inject('/shared/page.mdx')).body).toBe('processed b');
      expect((await server.inject('/_mosaic-raw/shared/page.mdx')).body).toBe('authored b');
      expect((await server.inject('/shared/private.mdx')).statusCode).toBe(404);
      expect((await server.inject('/_mosaic-raw/shared/private.mdx')).statusCode).toBe(404);
      expect((await server.inject('/shared/metadata.json')).statusCode).toBe(404);
      const json = await server.inject('/_mosaic-raw/shared/metadata.json');
      expect(json.statusCode).toBe(200);
      expect(json.json()).toEqual({ owner: 'b' });
    } finally {
      await server.close();
    }
  });
});
