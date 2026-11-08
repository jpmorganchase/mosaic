import { createHmac } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import fastifyMosaicWebhooks from '../plugins/mosaicWebhooksPlugin';

const SECRET = 'webhook-test-secret';
const DEBOUNCE_MS = 5000;
const URL = '/_mosaic_/webhooks/bitbucket';

const gitRepoSource = (repo: string, branch: string) => ({
  modulePath: '@jpmorganchase/mosaic-source-git-repo',
  namespace: 'docs',
  options: { repo, branch, credentials: 'user:token', remote: 'origin' }
});

const definitions = {
  'docs-main': gitRepoSource('https://bitbucketdc.example.com/scm/PROJ/docs.git', 'main'),
  'docs-develop': gitRepoSource(
    'ssh://git@bitbucketdc-ssh.example.com:7999/proj/docs.git',
    'develop'
  ),
  'other-main': gitRepoSource('https://bitbucketdc.example.com/scm/PROJ/other.git', 'main'),
  'github-main': gitRepoSource('https://github.com/PROJ/docs.git', 'main'),
  'local-folder': {
    modulePath: '@jpmorganchase/mosaic-source-local-folder',
    namespace: 'docs',
    options: { rootDir: '../docs', repo: 'https://bitbucketdc.example.com/scm/PROJ/docs.git' }
  }
};

const core = {
  listSources: vi.fn(),
  getSourceDefinition: vi.fn(),
  refreshSource: vi.fn()
};

function pushPayload(changes: Array<{ id: string; type?: string }>, slug = 'docs', key = 'PROJ') {
  return JSON.stringify({
    eventKey: 'repo:refs_changed',
    date: '2026-11-06T00:00:00+0000',
    actor: { name: 'a123456' },
    repository: { slug, name: slug, project: { key, name: 'Project' } },
    changes: changes.map(({ id, type = 'UPDATE' }) => ({
      ref: { id, displayId: id.replace(/^refs\/heads\//, ''), type: 'BRANCH' },
      refId: id,
      fromHash: 'a'.repeat(40),
      toHash: 'b'.repeat(40),
      type
    }))
  });
}

function sign(body: string, secret = SECRET) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('GIVEN the Bitbucket webhook endpoint', () => {
  let server: FastifyInstance;
  const originalSecret = process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET;

  const deliver = (
    body: string,
    {
      event = 'repo:refs_changed',
      signature = sign(body)
    }: { event?: string; signature?: string | null } = {}
  ) =>
    server.inject({
      method: 'POST',
      url: URL,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-event-key': event,
        'x-request-id': 'request-1',
        ...(signature === null ? {} : { 'x-hub-signature': signature })
      },
      payload: body
    });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET = SECRET;
    core.listSources.mockResolvedValue(
      Object.keys(definitions).map((name, index) => ({ name, index, pluginErrors: {} }))
    );
    core.getSourceDefinition.mockImplementation(name => definitions[name]);
    core.refreshSource.mockResolvedValue(true);

    server = Fastify();
    await server.register(
      fp(
        async instance => {
          instance.decorate('mosaic', { core } as never);
        },
        { name: 'fastify-mosaic' }
      )
    );
    await server.register(fastifyMosaicWebhooks, { prefix: '/_mosaic_' });
    server.post('/echo', async request => ({ parsed: request.body }));
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    if (originalSecret === undefined) delete process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET;
    else process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET = originalSecret;
  });

  test('THEN it is disabled when MOSAIC_BITBUCKET_WEBHOOK_SECRET is unset', async () => {
    delete process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET;
    const response = await deliver(pushPayload([{ id: 'refs/heads/main' }]));

    expect(response.statusCode).toBe(404);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).not.toHaveBeenCalled();
  });

  test('THEN it is disabled when the secret is a development placeholder outside development', async () => {
    process.env.MOSAIC_BITBUCKET_WEBHOOK_SECRET = 'local-dev-workflows-secret';
    const body = pushPayload([{ id: 'refs/heads/main' }]);
    const response = await deliver(body, { signature: sign(body, 'local-dev-workflows-secret') });

    expect(response.statusCode).toBe(404);
  });

  test.each([
    ['a missing', null],
    ['a wrong', sign('{"other":"body"}')],
    ['a wrongly keyed', undefined],
    ['a malformed', 'sha256=not-hex'],
    ['a SHA-1', `sha1=${'a'.repeat(40)}`]
  ])('THEN %s signature is rejected with 401', async (_label, signature) => {
    const body = pushPayload([{ id: 'refs/heads/main' }]);
    const response = await deliver(body, {
      signature: signature === undefined ? sign(body, 'not-the-secret') : signature
    });

    expect(response.statusCode).toBe(401);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).not.toHaveBeenCalled();
  });

  test('THEN a signed ping is answered with 200', async () => {
    const response = await deliver('{"test":true}', { event: 'diagnostics:ping' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Webhook is set up.' });
  });

  test('THEN other signed events are accepted and ignored', async () => {
    const response = await deliver('{"pullRequest":{}}', { event: 'pr:opened' });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ message: "Ignored event 'pr:opened'." });
    expect(core.listSources).not.toHaveBeenCalled();
  });

  test('THEN a signed push that is not JSON is rejected with 400', async () => {
    const response = await deliver('not json');
    expect(response.statusCode).toBe(400);
  });

  test('THEN a signed push refreshes the matching source exactly once, after the reply', async () => {
    const response = await deliver(pushPayload([{ id: 'refs/heads/main' }]));

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ message: 'Refreshing 1 source.', sources: ['docs-main'] });
    expect(core.refreshSource).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).toHaveBeenCalledTimes(1);
    expect(core.refreshSource).toHaveBeenCalledWith('docs-main');
  });

  test('THEN the project key and slug match case-insensitively across URL forms', async () => {
    const body = pushPayload(
      [{ id: 'refs/heads/develop' }, { id: 'refs/heads/main' }],
      'Docs',
      'proj'
    );
    const response = await deliver(body);

    expect(response.json().sources).toEqual(['docs-main', 'docs-develop']);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['another branch', pushPayload([{ id: 'refs/heads/feature/x' }])],
    ['a deleted branch', pushPayload([{ id: 'refs/heads/main', type: 'DELETE' }])],
    ['another repository', pushPayload([{ id: 'refs/heads/main' }], 'unknown')],
    ['another project', pushPayload([{ id: 'refs/heads/main' }], 'docs', 'OTHER')]
  ])('THEN a push to %s refreshes nothing', async (_label, body) => {
    const response = await deliver(body);

    expect(response.statusCode).toBe(202);
    expect(response.json().sources).toEqual([]);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).not.toHaveBeenCalled();
  });

  test('THEN a burst of pushes triggers one refresh, and a later push another', async () => {
    const body = pushPayload([{ id: 'refs/heads/main' }]);
    await deliver(body);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    await deliver(body);
    await deliver(body);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    expect(core.refreshSource).toHaveBeenCalledTimes(1);

    await deliver(body);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(core.refreshSource).toHaveBeenCalledTimes(2);
  });

  test('THEN a source that cannot refresh, or fails to, is only logged', async () => {
    core.refreshSource.mockResolvedValueOnce(false);
    await deliver(pushPayload([{ id: 'refs/heads/main' }]));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/can't refresh on demand/));

    core.refreshSource.mockRejectedValueOnce(new Error('git fetch failed'));
    await deliver(pushPayload([{ id: 'refs/heads/main' }]));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/refreshing docs-main failed/),
      expect.any(Error)
    );
  });

  test('THEN bodies over 1 MB are rejected', async () => {
    const body = JSON.stringify({ padding: 'x'.repeat(1024 * 1024) });
    const response = await deliver(body);
    expect(response.statusCode).toBe(413);
  });

  test('THEN routes outside the plugin still parse JSON bodies', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/echo',
      payload: { hello: 'world' }
    });
    expect(response.json()).toEqual({ parsed: { hello: 'world' } });
  });
});
