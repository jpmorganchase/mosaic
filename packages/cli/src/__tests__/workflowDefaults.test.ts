import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import workflows from '../plugins/mosaicWorkflowsPlugin';

const prepare = vi.fn();
const run = vi.fn();
const exists = vi.fn();
const realpath = vi.fn();
let app: FastifyInstance;
const headers = { authorization: 'Bearer test-workflows' };
const input = { name: 'save', user: { sid: 'editor' }, route: '/public/alias' };

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'test-workflows');
  prepare.mockResolvedValue({
    supportsCommitMessage: true,
    commitMessage: 'Source default',
    credentials: 'private'
  });
  run.mockImplementation(async send => {
    send('saved', 'COMPLETE');
    return true;
  });
  exists.mockResolvedValue(true);
  realpath.mockResolvedValue('/docs/page.mdx');
  app = Fastify();
  await app.register(
    fp(
      async server => {
        server.decorate('mosaic', {
          core: { prepareWorkflow: prepare, triggerWorkflow: run },
          fs: { promises: { exists, realpath, stat: async () => ({ isDirectory: () => true }) } }
        } as unknown as FastifyInstance['mosaic']);
      },
      { name: 'fastify-mosaic' }
    )
  );
  await app.register(workflows, { timeoutMs: 1000 });
});
afterEach(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

test('defaults and saves resolve aliases/directories to the same backing path; metadata is whitelisted', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/workflows/defaults',
    headers,
    payload: input
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ supportsCommitMessage: true, commitMessage: 'Source default' });
  expect(realpath).toHaveBeenCalledWith('/public/alias/index');
  expect(prepare).toHaveBeenCalledExactlyOnceWith('save', '/docs/page.mdx', {});
  expect(run).not.toHaveBeenCalled();
  expect(response.json()).not.toHaveProperty('jobId');
  await app.inject({
    method: 'POST',
    url: '/workflows/jobs',
    headers,
    payload: { ...input, markdown: '# Changed', commitMessage: 'Author text' }
  });
  expect(run).toHaveBeenCalledWith(expect.any(Function), 'save', '/docs/page.mdx', {
    user: input.user,
    markdown: '# Changed',
    commitMessage: 'Author text'
  });
});
test('new page metadata and saves use the same extension and do not accept browser source selection', async () => {
  exists.mockResolvedValue(false);
  const payload = { ...input, route: '/docs/new', isNewPage: true, source: 'other-source' };
  await app.inject({ method: 'POST', url: '/workflows/defaults', headers, payload });
  expect(prepare).toHaveBeenCalledWith('save', '/docs/new.mdx', { isNewPage: true });
  await app.inject({ method: 'POST', url: '/workflows/jobs', headers, payload });
  expect(run.mock.calls[0][2]).toBe('/docs/new.mdx');
  expect(run.mock.calls[0][4]).toEqual({ newPage: true });
});
test('unsupported workflows report false and remain saveable', async () => {
  prepare.mockResolvedValue({ supportsCommitMessage: false, options: { private: true } });
  const response = await app.inject({
    method: 'POST',
    url: '/workflows/defaults',
    headers,
    payload: input
  });
  expect(response.json()).toEqual({ supportsCommitMessage: false });
  expect(
    (await app.inject({ method: 'POST', url: '/workflows/jobs', headers, payload: input }))
      .statusCode
  ).toBe(202);
});
test('rejects unauthenticated, unsafe and missing page requests without inspecting defaults', async () => {
  expect(
    (await app.inject({ method: 'POST', url: '/workflows/defaults', payload: input })).statusCode
  ).toBe(401);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/workflows/defaults',
        headers,
        payload: { ...input, route: '/../page' }
      })
    ).statusCode
  ).toBe(400);
  exists.mockResolvedValue(false);
  expect(
    (await app.inject({ method: 'POST', url: '/workflows/defaults', headers, payload: input }))
      .statusCode
  ).toBe(404);
  expect(prepare).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});
test('invalid overrides are rejected before creating jobs, and malformed defaults do not leak', async () => {
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/workflows/jobs',
        headers,
        payload: { ...input, commitMessage: '' }
      })
    ).statusCode
  ).toBe(400);
  expect(run).not.toHaveBeenCalled();
  prepare.mockResolvedValue({
    supportsCommitMessage: true,
    commitMessage: 123,
    credentials: 'private'
  });
  const response = await app.inject({
    method: 'POST',
    url: '/workflows/defaults',
    headers,
    payload: input
  });
  expect(response.statusCode).toBe(400);
  expect(response.body).not.toContain('private');
});
