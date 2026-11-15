import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { EventEmitter } from 'node:events';
import PullDocs from '../../../core/src/PullDocs.js';
import fastifyMosaic from '../plugins/mosaicFastifyPlugin.js';
import workflowsPlugin from '../plugins/mosaicWorkflowsPlugin.js';

// Only replace the worker transport: source registration, mount order,
// filesystem reads, workflow ownership and HTTP endpoints remain real.
const workers = vi.hoisted(() => new Map<string, EventEmitter>());
vi.mock('../../../core/src/WorkerSubscription.js', async importOriginal => {
  const original = await importOriginal<typeof import('../../../core/src/WorkerSubscription.js')>();
  const { EventEmitter } = await import('node:events');
  return {
    ...original,
    default: class extends EventEmitter {
      closed = false;
      constructor({ options }: { options: { rootDir: string } }) {
        super();
        workers.set(options.rootDir, this);
      }
      stop() {
        this.closed = true;
        this.emit(original.EVENT.EXIT);
        this.removeAllListeners();
      }
    }
  };
});
vi.mock('../../../core/src/plugin/index.js', () => ({
  bindSerialiser: async () => ({}),
  bindPluginMethods: async () => ({})
}));

let root: string;
const resources: { server: FastifyInstance; mosaic: PullDocs }[] = [];
const headers = { authorization: 'Bearer ownership-test' };
const user = { sid: 'editor' };

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
beforeEach(() => {
  workers.clear();
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'ownership-test');
});
afterEach(async () => {
  for (const { server, mosaic } of resources.splice(0)) {
    await server.close();
    await mosaic.stop();
  }
  vi.unstubAllEnvs();
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

async function createServer(order: string[], scope?: string[], readOnly?: string) {
  workers.clear();
  const workflows = Object.fromEntries(
    ['a', 'b'].map(namespace => [
      namespace,
      {
        name: 'save',
        options: {},
        prepare: vi.fn(() => ({ supportsCommitMessage: true, commitMessage: `Save ${namespace}` })),
        action: vi.fn(async send => {
          send(`saved ${namespace}`, 'COMPLETE');
          return true;
        })
      }
    ])
  );
  const definitions = ['a', 'b'].map(namespace => ({
    namespace,
    modulePath: '@jpmorganchase/mosaic-source-local-folder',
    options: { prefixDir: 'shared', rootDir: path.join(root, namespace), extensions: ['.mdx'] },
    workflows: namespace === readOnly ? [] : [workflows[namespace]]
  }));
  const config = {
    sources: definitions,
    plugins: [],
    serialisers: [],
    ignorePages: [],
    pageExtensions: ['.mdx']
  };
  const mosaic = new PullDocs(config as never);
  const started = mosaic.start();
  await vi.waitFor(() => expect(workers.size).toBe(2));
  // Both sources register in declaration order, but complete startup in the
  // requested order. PullDocs mounts each source only after it has started.
  for (const namespace of order) {
    workers.get(path.join(root, namespace))!.emit('START');
    await new Promise(resolve => setImmediate(resolve));
  }
  const sources = await started;
  for (const source of sources) {
    const { namespace } = source;
    const files: Record<string, string> = {
      '/shared/page.mdx': `processed ${namespace}`,
      '/shared/space name.mdx': `processed space ${namespace}`
    };
    if (namespace === 'a') files['/shared/private.mdx'] = 'only a';
    source.filesystem.fromJSON(files);
    await source.filesystem.promises.symlink('/shared/page.mdx', '/shared/alias');
  }
  const server = Fastify();
  resources.push({ server, mosaic });
  await server.register(fastifyMosaic, { config: config as never, mosaic, scope });
  await server.register(workflowsPlugin, { timeoutMs: 1000 });
  return { server, mosaic, sources, workflows };
}

async function expectWorkflowOwner(
  fixture: Awaited<ReturnType<typeof createServer>>,
  owner: string,
  route = '/shared/page.mdx',
  isNewPage = false
) {
  const { server, workflows } = fixture;
  const input = { name: 'save', user, route, ...(isNewPage ? { isNewPage } : {}) };
  const defaults = await server.inject({
    method: 'POST',
    url: '/workflows/defaults',
    headers,
    payload: input
  });
  expect(defaults.statusCode).toBe(200);
  expect(defaults.json()).toEqual({ supportsCommitMessage: true, commitMessage: `Save ${owner}` });
  const result = await server.inject({
    method: 'POST',
    url: '/workflows/jobs',
    headers,
    payload: { ...input, markdown: `edited ${owner}` }
  });
  expect(result.statusCode).toBe(202);
  const events = await server.inject({
    url: `/workflows/jobs/${result.json().jobId}/events?user=editor`,
    headers
  });
  expect(events.body).toContain(`"message":"saved ${owner}"`);
  const savedPath = isNewPage ? `${route}.mdx` : '/shared/page.mdx';
  expect(workflows[owner].action).toHaveBeenLastCalledWith(
    expect.any(Function),
    expect.any(Object),
    {},
    savedPath,
    expect.objectContaining({ markdown: `edited ${owner}` })
  );
}

describe('raw reads and workflow ownership', () => {
  test.each([
    ['a', 'b'],
    ['b', 'a']
  ])('all endpoints follow startup order %s then %s', async (first, last) => {
    const fixture = await createServer([first, last]);
    const { server, workflows } = fixture;
    expect((await server.inject('/shared/page.mdx')).body).toBe(`processed ${last}`);
    const raw = await server.inject('/_mosaic-raw/shared/page.mdx');
    expect(raw.statusCode).toBe(200);
    expect(raw.body).toBe(`authored ${last}`);
    expect(raw.headers['x-mosaic-raw-namespace']).toBe(last);
    const encoded = await server.inject('/_mosaic-raw/shared/space%20name.mdx?preview=1');
    expect(encoded.statusCode).toBe(200);
    expect(encoded.body).toBe(`space ${last}`);
    await expectWorkflowOwner(fixture, last, '/shared/alias');
    expect(workflows[first].prepare).not.toHaveBeenCalled();
    expect(workflows[first].action).not.toHaveBeenCalled();
  });

  test('keeps raw reads, defaults and writes inside the server namespace scope', async () => {
    const fixture = await createServer(['b', 'a'], ['b']);
    const { server, workflows } = fixture;
    expect((await server.inject('/shared/page.mdx')).body).toBe('processed b');
    expect((await server.inject('/_mosaic-raw/shared/page.mdx')).body).toBe('authored b');
    expect((await server.inject('/shared/private.mdx')).statusCode).toBe(404);
    expect((await server.inject('/_mosaic-raw/shared/private.mdx')).statusCode).toBe(404);
    expect((await server.inject('/shared/metadata.json')).statusCode).toBe(404);
    const json = await server.inject('/_mosaic-raw/shared/metadata.json');
    expect(json.statusCode).toBe(200);
    expect(json.json()).toEqual({ owner: 'b' });
    await expectWorkflowOwner(fixture, 'b');
    expect(workflows.a.prepare).not.toHaveBeenCalled();
    expect(workflows.a.action).not.toHaveBeenCalled();
  });

  test('selects the remaining mounted owner after a source stops', async () => {
    const fixture = await createServer(['a', 'b']);
    const { mosaic, server, sources, workflows } = fixture;
    await mosaic.stopSource(sources.find(source => source.namespace === 'b')!.id.description!);
    expect((await server.inject('/shared/page.mdx')).body).toBe('processed a');
    expect((await server.inject('/_mosaic-raw/shared/page.mdx')).body).toBe('authored a');
    await expectWorkflowOwner(fixture, 'a');
    expect(workflows.b.prepare).not.toHaveBeenCalled();
    expect(workflows.b.action).not.toHaveBeenCalled();
  });

  test('does not save into an underlying source when the published owner has no workflow', async () => {
    const { server, workflows } = await createServer(['a', 'b'], undefined, 'b');
    expect((await server.inject('/_mosaic-raw/shared/page.mdx')).body).toBe('authored b');
    const payload = { name: 'save', user, route: '/shared/page.mdx' };
    expect(
      (await server.inject({ method: 'POST', url: '/workflows/defaults', headers, payload }))
        .statusCode
    ).toBe(400);
    const result = await server.inject({
      method: 'POST',
      url: '/workflows/jobs',
      headers,
      payload
    });
    const events = await server.inject({
      url: `/workflows/jobs/${result.json().jobId}/events?user=editor`,
      headers
    });
    expect(events.body).toContain('"status":"ERROR"');
    expect(workflows.a.prepare).not.toHaveBeenCalled();
    expect(workflows.a.action).not.toHaveBeenCalled();
  });

  test('ignores a source that stops while its ownership check is pending', async () => {
    const fixture = await createServer(['a', 'b']);
    const { mosaic, sources, workflows } = fixture;
    const source = sources.find(candidate => candidate.namespace === 'b')!;
    vi.spyOn(source.filesystem.promises, 'exists').mockImplementationOnce(async () => {
      await mosaic.stopSource(source.id.description!);
      return true;
    });
    expect((await mosaic.getSourceDefinitionForPath('/shared/page.mdx'))?.namespace).toBe('a');
    await expectWorkflowOwner(fixture, 'a');
    expect(workflows.b.prepare).not.toHaveBeenCalled();
    expect(workflows.b.action).not.toHaveBeenCalled();
  });

  test('preserves new-page prefix ownership and respects namespace scope', async () => {
    const unscoped = await createServer(['a', 'b']);
    await expectWorkflowOwner(unscoped, 'a', '/shared/new', true);
    const scoped = await createServer(['a', 'b'], ['b']);
    await expectWorkflowOwner(scoped, 'b', '/shared/new', true);
    expect(scoped.workflows.a.prepare).not.toHaveBeenCalled();
    expect(scoped.workflows.a.action).not.toHaveBeenCalled();
  });
});
