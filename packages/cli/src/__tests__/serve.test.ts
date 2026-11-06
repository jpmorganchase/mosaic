import { describe, expect, test, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { MosaicConfig } from '@jpmorganchase/mosaic-types';
import serve, { server } from '../serve';

const mosaicConfig: MosaicConfig = {
  enableSourcePush: true,
  schedule: {
    checkIntervalMins: 60,
    initialDelayMs: 1000,
    retryDelayMins: 15,
    maxRetries: 20,
    retryEnabled: true,
    resetOnSuccess: true
  },
  pageExtensions: ['.mdx', '.json'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [],
  plugins: [],
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic',
      options: {
        rootDir: '../../docs',
        prefixDir: 'mosaic',
        extensions: ['.mdx']
      }
    },
    {
      modulePath: '@jpmorganchase/mosaic-source-git-repo',
      namespace: 'mosaic',
      options: {
        credentials: 'david: Password1',
        prefixDir: 'mosaic/docs',
        subfolder: 'docs',
        repo: 'https://repo-url',
        branch: 'develop',
        extensions: ['.mdx'],
        remote: 'origin'
      }
    }
  ]
};

const mockFilesystemJSON = { '/file/path': { title: 'test 1' } };
const mockStopSourceFn = vi.fn().mockResolvedValue(true);
const mockAddSourceFn = vi.fn();
const mockTriggerWorkflowFn = vi.fn();
const mockRestartSourceFn = vi.fn().mockResolvedValue(true);
const mockListSourcesFn = vi
  .fn()
  .mockResolvedValue(mosaicConfig.sources.map((source, index) => ({ index, ...source })));

const mockExistsFn = vi.fn();
const mockStatFn = vi.fn();
const mockRealpathFn = vi.fn();
const mockReadFileFn = vi.fn();
const mockReaddirFn = vi.fn();
const mockScopeFn = vi.fn();

const mockFileSystem = {
  scope: mockScopeFn,
  toJSON: vi.fn().mockReturnValue(mockFilesystemJSON),
  promises: {
    exists: mockExistsFn,
    stat: mockStatFn,
    realpath: mockRealpathFn,
    readFile: mockReadFileFn,
    readdir: mockReaddirFn
  }
};

vi.mock('@jpmorganchase/mosaic-core', () => ({
  // Use a `function` (not an arrow) so the mock can be invoked with
  // `new` — Vitest 4 routes constructor calls through `Reflect.construct`,
  // which requires the implementation to be a constructable function.
  default: vi.fn().mockImplementation(function MosaicCoreMock() {
    return {
      start: vi.fn(),
      addSource: mockAddSourceFn,
      restartSource: mockRestartSourceFn,
      stopSource: mockStopSourceFn,
      listSources: mockListSourcesFn,
      triggerWorkflow: mockTriggerWorkflowFn,
      filesystem: mockFileSystem
    };
  })
}));

const ADMIN_SECRET = 'admin-test-secret';
const WORKFLOWS_SECRET = 'workflows-test-secret';
const adminHeaders = { 'x-mosaic-admin-secret': ADMIN_SECRET };
const ORIGINAL_ENV = {
  MOSAIC_ADMIN_SECRET: process.env.MOSAIC_ADMIN_SECRET,
  MOSAIC_WORKFLOWS_SECRET: process.env.MOSAIC_WORKFLOWS_SECRET
};

function restoreEnv(name: keyof typeof ORIGINAL_ENV) {
  if (ORIGINAL_ENV[name] === undefined) delete process.env[name];
  else process.env[name] = ORIGINAL_ENV[name];
}

describe('GIVEN the serve command', () => {
  beforeAll(async () => {
    process.env.MOSAIC_ADMIN_SECRET = ADMIN_SECRET;
    process.env.MOSAIC_WORKFLOWS_SECRET = WORKFLOWS_SECRET;
    await serve(mosaicConfig, 0, undefined /** scope */);
  });

  afterAll(async () => {
    await server.close();
    restoreEnv('MOSAIC_ADMIN_SECRET');
    restoreEnv('MOSAIC_WORKFLOWS_SECRET');
  });

  test('THEN a mosaic instance is created and available to server plugins', async () => {
    expect(server.mosaic).toBeDefined();
    expect(server.mosaic.core).toBeDefined();
  });

  test('THEN a mosaic filesystem is created and available to server plugins', async () => {
    expect(server.mosaic.fs).toBeDefined();
  });

  test('THEN the mosaic config is available to server plugins', async () => {
    expect(server.mosaic.fs).toBeDefined();
  });

  describe('AND WHEN server healthcheck is requested', async () => {
    test('THEN the server responds with a 200 OK', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/actuator/keepalive'
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('OK');
    });
  });

  describe('AND WHEN using the Admin APIs', () => {
    test('THEN protected Admin APIs are disabled when MOSAIC_ADMIN_SECRET is unset', async () => {
      delete process.env.MOSAIC_ADMIN_SECRET;
      try {
        const response = await server.inject({
          method: 'GET',
          url: '/_mosaic_/content/dump',
          headers: adminHeaders
        });
        expect(response.statusCode).toEqual(403);
        expect(response.payload).toMatch(/MOSAIC_ADMIN_SECRET/);
      } finally {
        process.env.MOSAIC_ADMIN_SECRET = ADMIN_SECRET;
      }
    });

    test('THEN protected Admin APIs are open in development when MOSAIC_ADMIN_SECRET is unset', async () => {
      const nodeEnv = process.env.NODE_ENV;
      delete process.env.MOSAIC_ADMIN_SECRET;
      process.env.NODE_ENV = 'development';
      try {
        const response = await server.inject({ method: 'GET', url: '/_mosaic_/content/dump' });
        expect(response.statusCode).toEqual(200);
      } finally {
        process.env.NODE_ENV = nodeEnv;
        process.env.MOSAIC_ADMIN_SECRET = ADMIN_SECRET;
      }
    });

    test('THEN a configured secret is still required in development', async () => {
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const response = await server.inject({ method: 'GET', url: '/_mosaic_/content/dump' });
        expect(response.statusCode).toEqual(401);
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }
    });

    test('THEN protected Admin APIs reject a missing or wrong secret', async () => {
      const missing = await server.inject({ method: 'GET', url: '/_mosaic_/config' });
      expect(missing.statusCode).toEqual(401);
      // Makes browsers show a login prompt; the secret is the password.
      expect(missing.headers['www-authenticate']).toEqual(
        'Basic realm="Mosaic admin", charset="UTF-8"'
      );

      const wrong = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/stop',
        headers: { authorization: 'Bearer not-the-secret' },
        payload: { name: 'stop-me' }
      });
      expect(wrong.statusCode).toEqual(401);
      expect(mockStopSourceFn).not.toHaveBeenCalled();
    });

    test('THEN the Admin APIs accept the secret as a Bearer token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/content/dump',
        headers: { authorization: `Bearer ${ADMIN_SECRET}` }
      });
      expect(response.statusCode).toEqual(200);
    });

    test('THEN the Admin APIs accept the secret as a Basic auth password', async () => {
      const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
      const accepted = await server.inject({
        method: 'GET',
        url: '/_mosaic_/content/dump',
        headers: { authorization: basic(`any-user:${ADMIN_SECRET}`) }
      });
      expect(accepted.statusCode).toEqual(200);

      const rejected = await server.inject({
        method: 'GET',
        url: '/_mosaic_/content/dump',
        headers: { authorization: basic(`${ADMIN_SECRET}:wrong`) }
      });
      expect(rejected.statusCode).toEqual(401);
    });

    test('THEN the config Admin API returns the mosaic config', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/config',
        headers: adminHeaders
      });
      expect(response.statusCode).toEqual(200);
      const responseConfig = JSON.parse(response.payload);
      expect({ ...responseConfig, sources: [] }).toEqual({ ...mosaicConfig, sources: [] });
      expect(responseConfig.sources[0]).toEqual(mosaicConfig.sources[0]);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');

      // confirm credentials are sanitized for git repo sources
      expect(responseConfig.sources[1].options.credentials).toEqual('david: ********');
      // ...without touching the live config the sources restart with
      expect((mosaicConfig.sources[1].options as { credentials: string }).credentials).toEqual(
        'david: Password1'
      );
    });

    test('THEN the list sources Admin API returns the running sources', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/sources/list',
        headers: adminHeaders
      });
      expect(mockListSourcesFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
      const sources = JSON.parse(response.payload);
      expect(sources[0]).toEqual(mosaicConfig.sources[0]);
      expect({ ...sources[1], options: {} }).toEqual({ ...mosaicConfig.sources[1], options: {} });

      // confirm credentials are sanitized for git repo sources
      expect(sources[1].options.credentials).toEqual('david: ********');
    });

    test('THEN the Get Filesystem Admin API returns the current fs content', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/content/dump',
        headers: adminHeaders
      });

      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
      expect(JSON.parse(response.payload)).toEqual(mockFilesystemJSON);
    });

    describe('AND WHEN the tags list Admin API is requested', () => {
      // Each test sets its own `readdir` / `exists` behaviour;
      // reset between cases so a previous test's expectation
      // doesn't bleed in (Vitest preserves call history across
      // siblings unless we clear).
      beforeEach(() => {
        mockExistsFn.mockReset();
        mockReaddirFn.mockReset();
      });

      test('THEN it returns the sorted tag names from /.tags', async () => {
        mockExistsFn.mockResolvedValueOnce(true);
        // Deliberately unsorted input — the endpoint must sort so
        // the editor's ComboBox dropdown order stays stable across
        // reloads even when memfs iteration order changes.
        mockReaddirFn.mockResolvedValueOnce(['platform', 'blog', 'design-system']);

        const response = await server.inject({
          method: 'GET',
          url: '/_mosaic_/tags/list'
        });

        expect(mockExistsFn).toHaveBeenCalledWith('/.tags');
        expect(mockReaddirFn).toHaveBeenCalledWith('/.tags');
        expect(response.statusCode).toEqual(200);
        expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
        expect(JSON.parse(response.payload)).toEqual(['blog', 'design-system', 'platform']);
      });

      test('THEN it returns [] when /.tags does not exist', async () => {
        // Cold-start path: `$TagPlugin` hasn't run yet because no
        // source has emitted tagged pages. The endpoint must
        // return 200 + [] (not 404) so the host's
        // <TagSuggestionsProvider> still mounts and the editor
        // surfaces the same free-text ComboBox the host gets
        // when it doesn't opt in at all.
        mockExistsFn.mockResolvedValueOnce(false);

        const response = await server.inject({
          method: 'GET',
          url: '/_mosaic_/tags/list'
        });

        expect(mockExistsFn).toHaveBeenCalledWith('/.tags');
        expect(mockReaddirFn).not.toHaveBeenCalled();
        expect(response.statusCode).toEqual(200);
        expect(JSON.parse(response.payload)).toEqual([]);
      });

      test('THEN it returns [] (not 500) when readdir throws', async () => {
        // Tags are a quality-of-life feature for the editor; a
        // transient FS read failure must not poison the editor
        // mount with a 500 — the editor would surface that as a
        // dialog failure and the author couldn't even open the
        // Frontmatter tab. Logged-and-degrade is the only sane
        // policy.
        mockExistsFn.mockResolvedValueOnce(true);
        mockReaddirFn.mockRejectedValueOnce(new Error('EIO'));

        // Silence the expected console.error so the test output
        // stays clean.
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await server.inject({
          method: 'GET',
          url: '/_mosaic_/tags/list'
        });

        expect(response.statusCode).toEqual(200);
        expect(JSON.parse(response.payload)).toEqual([]);
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
      });
    });

    test('THEN the Stop Source Admin API stops a source if a valid name is given', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/stop',
        headers: adminHeaders,
        payload: { name: 'stop-me' }
      });

      expect(mockStopSourceFn).toBeCalledTimes(1);
      expect(mockStopSourceFn.mock.calls[0][0]).toEqual('stop-me');
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('stop-me stopped successfully.');
    });

    test('THEN the Stop Source Admin API returns an error if a source name is not provided', async () => {
      mockStopSourceFn.mockClear();
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/stop',
        headers: adminHeaders,
        payload: { something: 'stop-me' }
      });

      expect(mockStopSourceFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('No source name provided.');
    });

    test('THEN the Stop Source Admin API returns an error if the source cannot be stopped', async () => {
      mockStopSourceFn.mockReset();
      mockStopSourceFn.mockRejectedValueOnce(new Error('oopsy'));
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/stop',
        headers: adminHeaders,
        payload: { name: 'stop-me' }
      });

      expect(mockStopSourceFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('stop-me not stopped.  Check you have the right name!');
    });

    test('THEN the Restart Source Admin API restarts a source if a valid name is given', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/restart',
        headers: adminHeaders,
        payload: { name: 'restart-me' }
      });

      expect(mockRestartSourceFn).toBeCalledTimes(1);
      expect(mockRestartSourceFn.mock.calls[0][0]).toEqual('restart-me');
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('restart-me restarted successfully.');
    });

    test('THEN the Restart Source Admin API returns an error if a source name is not provided', async () => {
      mockRestartSourceFn.mockClear();
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/restart',
        headers: adminHeaders,
        payload: { something: 'restart-me' }
      });

      expect(mockRestartSourceFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('No source name provided.');
    });

    test('THEN the Restart Source Admin API returns an error if the source cannot be stopped', async () => {
      mockRestartSourceFn.mockReset();
      mockRestartSourceFn.mockRejectedValueOnce(new Error('oopsy'));
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/restart',
        headers: adminHeaders,
        payload: { name: 'restart-me' }
      });

      expect(mockRestartSourceFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('restart-me not restarted.  Check you have the right name!');
    });
  });

  describe('AND WHEN source pushing is enabled', () => {
    beforeEach(() => {
      mockAddSourceFn.mockClear();
    });

    test('THEN the Add Source Admin API adds a source when a valid definition is provided', async () => {
      const payload = {
        definition: {
          disabled: false,
          modulePath: '@jpmorganchase/mosaic-source-local-folder',
          namespace: 'mosaic',
          options: {
            rootDir: '../../docs',
            prefixDir: 'mosaic',
            extensions: ['.mdx']
          }
        },
        isPreview: false
      };

      mockAddSourceFn.mockResolvedValue({
        ...payload.definition,
        id: { description: 'added-source' }
      });

      const response = await server.inject({
        method: 'POST',
        url: '/_mosaic_/source/add',
        headers: adminHeaders,
        payload
      });

      expect(mockAddSourceFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('Source added-source added successfully');
    });

    test('THEN the Add Source Admin API throws an error when no definition is provided', async () => {
      const payload = {
        source: {
          disabled: false,
          modulePath: '@jpmorganchase/mosaic-source-local-folder',
          namespace: 'mosaic',
          options: {
            rootDir: '../../docs',
            prefixDir: 'mosaic',
            extensions: ['.mdx']
          }
        },
        isPreview: false
      };

      mockAddSourceFn.mockResolvedValue({
        ...payload.source,
        id: { description: 'added-source' }
      });

      const response = await server.inject({
        method: 'POST',
        url: '/_mosaic_/source/add',
        headers: adminHeaders,
        payload
      });

      expect(mockAddSourceFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('Source definition is required');
    });

    test('THEN the Add Source Admin API can add preview sources', async () => {
      const payload = {
        definition: {
          disabled: false,
          modulePath: '@jpmorganchase/mosaic-source-local-folder',
          namespace: 'mosaic',
          options: {
            rootDir: '../../docs',
            prefixDir: 'mosaic',
            extensions: ['.mdx']
          }
        },
        isPreview: true
      };

      mockAddSourceFn.mockResolvedValue({
        ...payload.definition,
        id: { description: 'added-source' }
      });

      const response = await server.inject({
        method: 'POST',
        url: '/_mosaic_/source/add',
        headers: adminHeaders,
        payload
      });

      expect(mockAddSourceFn).toBeCalledTimes(1);
      expect(mockAddSourceFn.mock.calls[0][0].namespace).toEqual('preview-mosaic');
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('Source added-source added successfully');
    });

    test('THEN the Add Source Admin API returns an error if the source cannot be added', async () => {
      mockAddSourceFn.mockRejectedValueOnce(new Error('oopsy'));

      const payload = {
        definition: {
          disabled: false,
          modulePath: '@jpmorganchase/mosaic-source-local-folder',
          namespace: 'mosaic',
          options: {
            rootDir: '../../docs',
            prefixDir: 'mosaic',
            extensions: ['.mdx']
          }
        },
        isPreview: false
      };

      const response = await server.inject({
        method: 'POST',
        url: '/_mosaic_/source/add',
        headers: adminHeaders,
        payload
      });

      expect(mockAddSourceFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('oopsy');
    });
  });

  describe('AND WHEN running a workflow over HTTP and following it over SSE', () => {
    const user = { sid: 'dreid', name: 'David Reid', email: 'email.address@something.com' };
    const auth = { authorization: `Bearer ${WORKFLOWS_SECRET}` };
    const prMessage = { links: { self: [{ href: 'https://example.test/pr/1' }] } };

    beforeEach(() => {
      mockExistsFn.mockReset();
      mockRealpathFn.mockReset();
      mockStatFn.mockReset();
      mockTriggerWorkflowFn.mockReset();
      delete process.env.MOSAIC_WORKFLOWS_TIMEOUT_MS;
    });

    function givenAnExistingPage(pagePath = '/file/path.mdx') {
      mockExistsFn.mockResolvedValueOnce(true);
      mockStatFn.mockResolvedValueOnce({ isDirectory: () => false });
      mockRealpathFn.mockResolvedValueOnce(pagePath);
    }

    function startJob(payload: unknown, headers: Record<string, string> = auth) {
      return server.inject({
        method: 'POST',
        url: '/workflows/jobs',
        headers: { 'content-type': 'application/json', ...headers },
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
      });
    }

    async function startedJobId(payload: unknown) {
      const response = await startJob(payload);
      expect(response.statusCode).toEqual(202);
      return response.json().jobId as string;
    }

    function getEvents(
      jobId: string,
      { query = `user=${user.sid}`, headers = auth }: { query?: string; headers?: object } = {}
    ) {
      return server.inject({
        method: 'GET',
        url: `/workflows/jobs/${jobId}/events?${query}`,
        headers: { ...headers }
      });
    }

    const sse = (id: number, event: string, data: unknown) =>
      `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const starting = sse(1, 'progress', {
      status: 'IN_PROGRESS',
      message: 'Starting workflow save'
    });

    describe('AND WHEN authenticating', () => {
      test('THEN workflows are refused with a 503 when MOSAIC_WORKFLOWS_SECRET is unset', async () => {
        delete process.env.MOSAIC_WORKFLOWS_SECRET;
        try {
          const start = await startJob({ user, route: '/file/path', name: 'save' });
          expect(start.statusCode).toEqual(503);
          expect(start.json().error).toMatch(/MOSAIC_WORKFLOWS_SECRET/);
          const events = await getEvents('any');
          expect(events.statusCode).toEqual(503);
          expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
        } finally {
          process.env.MOSAIC_WORKFLOWS_SECRET = WORKFLOWS_SECRET;
        }
      });

      test('THEN the development placeholder secret is refused outside development', async () => {
        process.env.MOSAIC_WORKFLOWS_SECRET = 'local-dev-workflows-secret';
        try {
          const start = await startJob(
            { user, route: '/file/path', name: 'save' },
            { authorization: 'Bearer local-dev-workflows-secret' }
          );
          expect(start.statusCode).toEqual(503);
        } finally {
          process.env.MOSAIC_WORKFLOWS_SECRET = WORKFLOWS_SECRET;
        }
      });

      test('THEN a missing or wrong secret gets a 401', async () => {
        const missing = await startJob({ user, route: '/file/path', name: 'save' }, {});
        expect(missing.statusCode).toEqual(401);
        expect(missing.json()).toEqual({ error: 'Unauthorized.' });

        const wrong = await startJob(
          { user, route: '/file/path', name: 'save' },
          { authorization: 'Bearer not-the-secret' }
        );
        expect(wrong.statusCode).toEqual(401);

        const events = await getEvents('any', { headers: { authorization: 'Bearer nope' } });
        expect(events.statusCode).toEqual(401);
        expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
      });
    });

    describe('AND WHEN the request is invalid', () => {
      test.each([
        [{ user, route: '/file/path' }, 'Workflow name is required'],
        [{ route: '/file/path', name: 'save' }, 'Workflow must be run for a user'],
        [{ user, route: '/file/../../etc/passwd', name: 'save' }, 'Workflow route is invalid'],
        [
          { user, route: '/file/path', targetRoute: '/file/..\\..\\x.mdx', name: 'save' },
          'Workflow target route is invalid'
        ],
        [[1, 2], 'Workflow request must be a JSON object']
      ])('THEN %j gets a 400', async (payload, error) => {
        const response = await startJob(payload);
        expect(response.statusCode).toEqual(400);
        expect(response.json()).toEqual({ error });
        expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
      });

      test('THEN a body that is not JSON gets a 400', async () => {
        const response = await startJob('{not json');
        expect(response.statusCode).toEqual(400);
        expect(typeof response.json().error).toEqual('string');
      });

      test('THEN a body over 5 MB gets a 413', async () => {
        const response = await startJob({
          user,
          route: '/file/path',
          name: 'save',
          markdown: 'x'.repeat(5 * 1024 * 1024)
        });
        expect(response.statusCode).toEqual(413);
        expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
      });

      test('THEN a page that does not exist gets a 404', async () => {
        mockExistsFn.mockResolvedValueOnce(false);
        const response = await startJob({ user, route: '/file/path', name: 'save' });
        expect(response.statusCode).toEqual(404);
        expect(response.json()).toEqual({ error: '/file/path not found' });
        expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
      });

      test('THEN creating a page that already exists gets a 409', async () => {
        mockExistsFn.mockResolvedValueOnce(true);
        const response = await startJob({
          user,
          route: '/file/path',
          isNewPage: true,
          name: 'save'
        });
        expect(response.statusCode).toEqual(409);
        expect(response.json()).toEqual({ error: '/file/path.mdx already exists' });
        expect(mockTriggerWorkflowFn).not.toHaveBeenCalled();
      });
    });

    test('THEN the workflow runs for an existing page and its progress is streamed', async () => {
      givenAnExistingPage();
      mockTriggerWorkflowFn.mockImplementationOnce(async send => {
        send('Saved page', 'IN_PROGRESS');
        send(prMessage, 'COMPLETE');
        return true;
      });

      const jobId = await startedJobId({
        user,
        route: '/file/path',
        markdown: '### This is a title',
        name: 'save',
        token: 'ignored',
        channel: 'ignored'
      });

      expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
      expect(mockTriggerWorkflowFn).toBeCalledTimes(1);
      const [, name, filePath, data, options] = mockTriggerWorkflowFn.mock.calls[0];
      expect(name).toEqual('save');
      expect(filePath).toEqual('/file/path.mdx');
      expect(options).toBeUndefined();
      // Legacy `token` and `channel` fields never reach the workflow.
      expect(data).toEqual({ user, markdown: '### This is a title' });

      const events = await getEvents(jobId);
      expect(events.statusCode).toEqual(200);
      expect(events.headers['content-type']).toEqual('text/event-stream; charset=utf-8');
      expect(events.headers['cache-control']).toEqual('no-cache, no-transform');
      expect(events.headers.connection).toEqual('keep-alive');
      expect(events.headers['x-accel-buffering']).toEqual('no');
      expect(events.body).toEqual(
        starting +
          sse(2, 'progress', { status: 'IN_PROGRESS', message: 'Saved page' }) +
          sse(3, 'done', { status: 'SUCCESS', message: prMessage })
      );
    });

    test('THEN events are delivered while the workflow is still running', async () => {
      givenAnExistingPage();
      let finish: () => void = () => {};
      mockTriggerWorkflowFn.mockImplementationOnce(
        send =>
          new Promise(resolve => {
            finish = () => {
              send('Saved page', 'IN_PROGRESS');
              resolve(true);
            };
          })
      );
      const jobId = await startedJobId({ user, route: '/file/path', name: 'save' });

      const events = getEvents(jobId);
      await new Promise(resolve => setTimeout(resolve, 20));
      finish();

      expect((await events).body).toEqual(
        starting +
          sse(2, 'progress', { status: 'IN_PROGRESS', message: 'Saved page' }) +
          sse(3, 'done', { status: 'SUCCESS', message: 'Workflow save finished' })
      );
    });

    test('THEN the stream is flushed to a real HTTP client as events happen', async () => {
      givenAnExistingPage();
      let finish: () => void = () => {};
      mockTriggerWorkflowFn.mockImplementationOnce(
        send =>
          new Promise(resolve => {
            finish = () => {
              send(prMessage, 'COMPLETE');
              resolve(true);
            };
          })
      );
      const jobId = await startedJobId({ user, route: '/file/path', name: 'save' });
      const { port } = server.server.address() as AddressInfo;

      const response = await fetch(
        `http://127.0.0.1:${port}/workflows/jobs/${jobId}/events?user=${user.sid}`,
        { headers: auth }
      );
      expect(response.status).toEqual(200);
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      expect(decoder.decode((await reader.read()).value)).toEqual(starting);

      finish();
      let rest = '';
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        rest += decoder.decode(chunk.value);
      }
      expect(rest).toEqual(sse(2, 'done', { status: 'SUCCESS', message: prMessage }));
    });

    test('THEN the workflow is run for the index page if a directory path is provided', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockStatFn.mockResolvedValueOnce({ isDirectory: () => true });
      mockRealpathFn.mockResolvedValueOnce('/file/path/index.mdx');
      mockTriggerWorkflowFn.mockResolvedValueOnce(true);

      await startedJobId({ user, route: '/file/path', name: 'save' });

      expect(mockRealpathFn).toHaveBeenCalledWith('/file/path/index');
      expect(mockTriggerWorkflowFn.mock.calls[0][2]).toEqual('/file/path/index.mdx');
    });

    test('THEN an existing page no source owns is reported as an ERROR', async () => {
      givenAnExistingPage();
      mockTriggerWorkflowFn.mockImplementationOnce(async send => {
        send('Workflow save not found', 'ERROR');
        return false;
      });
      const jobId = await startedJobId({ user, route: '/file/path', name: 'save' });

      const events = await getEvents(jobId);
      expect(events.body).toEqual(
        starting + sse(2, 'done', { status: 'ERROR', message: 'Workflow save not found' })
      );
      expect(events.body).not.toContain('SUCCESS');
    });

    test('THEN a workflow that throws is reported as an ERROR', async () => {
      givenAnExistingPage();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockTriggerWorkflowFn.mockRejectedValueOnce(new Error('boom'));
      const jobId = await startedJobId({ user, route: '/file/path', name: 'save' });

      const events = await getEvents(jobId);
      expect(events.body).toEqual(starting + sse(2, 'done', { status: 'ERROR', message: 'boom' }));
      errorSpy.mockRestore();
    });

    test('THEN a workflow that does not finish in MOSAIC_WORKFLOWS_TIMEOUT_MS fails', async () => {
      process.env.MOSAIC_WORKFLOWS_TIMEOUT_MS = '50';
      givenAnExistingPage();
      mockTriggerWorkflowFn.mockImplementationOnce(() => new Promise(() => {}));
      const jobId = await startedJobId({ user, route: '/file/path', name: 'save' });

      const events = await getEvents(jobId);
      expect(events.body).toEqual(
        starting +
          sse(2, 'done', {
            status: 'ERROR',
            message: 'The workflow did not finish within 50 ms.'
          })
      );
    });

    test('THEN a new page is passed to core to pick its owning source', async () => {
      mockExistsFn.mockResolvedValue(false);
      mockTriggerWorkflowFn.mockImplementationOnce(async send => {
        send(prMessage, 'COMPLETE');
        return true;
      });

      const jobId = await startedJobId({
        user,
        route: '/file/nested/new-page',
        markdown: '# New',
        isNewPage: true,
        name: 'save'
      });

      const [, , filePath, data, options] = mockTriggerWorkflowFn.mock.calls[0];
      expect(filePath).toEqual('/file/nested/new-page.mdx');
      expect(options).toEqual({ newPage: true });
      expect(data).toEqual({ user, markdown: '# New', isNewPage: true });
      expect((await getEvents(jobId)).body).toContain(
        sse(2, 'done', { status: 'SUCCESS', message: prMessage })
      );
    });

    test('THEN a new page no source can create is reported as an ERROR', async () => {
      mockExistsFn.mockResolvedValue(false);
      mockTriggerWorkflowFn.mockImplementationOnce(async send => {
        send('No source can create /elsewhere/new-page.mdx', 'ERROR');
        return false;
      });

      const jobId = await startedJobId({
        user,
        route: '/elsewhere/new-page',
        isNewPage: true,
        name: 'save'
      });

      expect((await getEvents(jobId)).body).toEqual(
        starting +
          sse(2, 'done', {
            status: 'ERROR',
            message: 'No source can create /elsewhere/new-page.mdx'
          })
      );
    });

    describe('AND WHEN following a job', () => {
      async function finishedJob() {
        givenAnExistingPage();
        mockTriggerWorkflowFn.mockImplementationOnce(async send => {
          send('Saved page', 'IN_PROGRESS');
          send(prMessage, 'COMPLETE');
          return true;
        });
        return startedJobId({ user, route: '/file/path', name: 'save' });
      }

      test('THEN only the events after Last-Event-ID are replayed', async () => {
        const jobId = await finishedJob();
        const fromHeader = await getEvents(jobId, {
          headers: { ...auth, 'last-event-id': '2' }
        });
        expect(fromHeader.body).toEqual(sse(3, 'done', { status: 'SUCCESS', message: prMessage }));

        const fromQuery = await getEvents(jobId, { query: `user=${user.sid}&lastEventId=1` });
        expect(fromQuery.body).toEqual(
          sse(2, 'progress', { status: 'IN_PROGRESS', message: 'Saved page' }) +
            sse(3, 'done', { status: 'SUCCESS', message: prMessage })
        );
      });

      test('THEN a client that already saw done gets it again', async () => {
        const jobId = await finishedJob();
        const events = await getEvents(jobId, { headers: { ...auth, 'last-event-id': '3' } });
        expect(events.body).toEqual(sse(3, 'done', { status: 'SUCCESS', message: prMessage }));
      });

      test('THEN another user, a missing user or an unknown job gets a 404', async () => {
        const jobId = await finishedJob();
        const otherUser = await getEvents(jobId, { query: 'user=someone-else' });
        expect(otherUser.statusCode).toEqual(404);
        expect(otherUser.json()).toEqual({ error: 'Workflow job not found' });
        expect((await getEvents(jobId, { query: '' })).statusCode).toEqual(404);
        expect((await getEvents('00000000-0000-0000-0000-000000000000')).statusCode).toEqual(404);
      });
    });
  });

  describe('AND WHEN requesting content', () => {
    beforeEach(() => {
      mockExistsFn.mockClear();
      mockRealpathFn.mockClear();
      mockReadFileFn.mockClear();
      mockStatFn.mockClear();
    });

    test('THEN an MDX page is returned if it exists', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path.mdx');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(false) });
      mockReadFileFn.mockResolvedValueOnce('Some page content');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockRealpathFn).toBeCalledTimes(1);
      expect(mockStatFn).toBeCalledTimes(1);
      expect(mockReadFileFn).toBeCalledTimes(1);

      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('Some page content');
      expect(response.headers['content-type']).toEqual('text/mdx');
    });

    test('THEN an JSON page is returned if it exists', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path.json');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(false) });
      mockReadFileFn.mockResolvedValueOnce({ content: 'some content' });

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockRealpathFn).toBeCalledTimes(1);
      expect(mockStatFn).toBeCalledTimes(1);
      expect(mockReadFileFn).toBeCalledTimes(1);

      expect(response.statusCode).toEqual(200);
      expect(JSON.parse(response.payload)).toEqual({ content: 'some content' });
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    test('THEN an XML page is returned if it exists', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path.xml');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(false) });
      mockReadFileFn.mockResolvedValueOnce('some xml');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockRealpathFn).toBeCalledTimes(1);
      expect(mockStatFn).toBeCalledTimes(1);
      expect(mockReadFileFn).toBeCalledTimes(1);

      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('some xml');
      expect(response.headers['content-type']).toEqual('application/xml');
    });

    test('THEN index pages are redirected if found', async () => {
      mockExistsFn.mockResolvedValue(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path.xml');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(true) });
      mockReadFileFn.mockResolvedValueOnce('some xml');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(2);
      expect(mockReadFileFn).toBeCalledTimes(0);

      expect(response.statusCode).toEqual(302);
      expect(JSON.parse(response.payload)).toEqual({ redirect: '/file/path/index' });
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    test('THEN pages return 404 if not found', async () => {
      mockExistsFn.mockResolvedValueOnce(false);
      mockRealpathFn.mockResolvedValueOnce('/file/path.xml');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(true) });
      mockReadFileFn.mockResolvedValueOnce('some xml');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockReadFileFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(404);
    });

    test('THEN index pages return 404 if not found', async () => {
      mockExistsFn.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockRealpathFn.mockResolvedValueOnce('/file/path.xml');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(true) });
      mockReadFileFn.mockResolvedValueOnce('some xml');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(2);
      expect(mockReadFileFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(404);
    });

    test('THEN returns a 500 if an error occurs', async () => {
      mockExistsFn.mockRejectedValueOnce(new Error('oopsy'));
      mockRealpathFn.mockResolvedValueOnce('/file/path.xml');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValueOnce(true) });
      mockReadFileFn.mockResolvedValueOnce('some xml');

      const response = await server.inject({
        method: 'GET',
        url: '/file/path'
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockReadFileFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(500);
    });
  });
});
