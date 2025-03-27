import { describe, expect, test, vi, beforeAll, afterAll, beforeEach } from 'vitest';
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
const mockScopeFn = vi.fn();

const mockFileSystem = {
  scope: mockScopeFn,
  toJSON: vi.fn().mockReturnValue(mockFilesystemJSON),
  promises: {
    exists: mockExistsFn,
    stat: mockStatFn,
    realpath: mockRealpathFn,
    readFile: mockReadFileFn
  }
};

vi.mock('@jpmorganchase/mosaic-core', () => ({
  default: vi.fn().mockImplementation(() => {
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

describe('GIVEN the serve command', () => {
  beforeAll(async () => {
    await serve(mosaicConfig, 8080, undefined /** scope */);
  });

  afterAll(async () => {
    await server.close();
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
    test('THEN the config Admin API returns the mosaic config', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/config'
      });
      expect(response.statusCode).toEqual(200);
      const responseConfig = JSON.parse(response.payload);
      expect(responseConfig).toEqual(mosaicConfig);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');

      // confirm credentials are sanitized for git repo sources
      expect(responseConfig.sources[1].options.credentials).toEqual('david: ********');
    });

    test('THEN the list sources Admin API returns the running sources', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/sources/list'
      });
      expect(mockListSourcesFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
      const sources = JSON.parse(response.payload);
      expect(sources).toEqual(mosaicConfig.sources);

      // confirm credentials are sanitized for git repo sources
      expect(sources[1].options.credentials).toEqual('david: ********');
    });

    test('THEN the Get Filesystem Admin API returns the current fs content', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/_mosaic_/content/dump'
      });

      expect(response.statusCode).toEqual(200);
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
      expect(JSON.parse(response.payload)).toEqual(mockFilesystemJSON);
    });

    test('THEN the Stop Source Admin API stops a source if a valid name is given', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/_mosaic_/source/stop',
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
        payload
      });

      expect(mockAddSourceFn).toBeCalledTimes(1);
      expect(response.statusCode).toEqual(500);
      expect(response.headers['content-type']).toEqual('application/text');
      expect(response.payload).toEqual('oopsy');
    });
  });

  /** TODO work out how to test web sockets  */
  describe.skip('AND WHEN running a workflow', () => {
    beforeEach(() => {
      mockExistsFn.mockClear();
      mockRealpathFn.mockClear();
      mockStatFn.mockClear();
      mockTriggerWorkflowFn.mockClear();
    });

    test('THEN the workflow is run if the page exists', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockResolvedValueOnce(false) });
      mockTriggerWorkflowFn.mockResolvedValueOnce('workflow result');
      const response = await server.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          user: { name: 'David Reid', email: 'email.address@something.com' },
          route: '/file/path',
          markdown: '### This is a title',
          name: 'save'
        }
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockRealpathFn).toBeCalledTimes(1);
      expect(mockStatFn).toBeCalledTimes(1);
      expect(mockTriggerWorkflowFn).toBeCalledTimes(1);
      expect(mockTriggerWorkflowFn.mock.calls[0][0]).toEqual('save');
      expect(mockTriggerWorkflowFn.mock.calls[0][1]).toEqual('/file/path');
      expect(mockTriggerWorkflowFn.mock.calls[0][2]).toEqual({
        markdown: '### This is a title',
        user: { name: 'David Reid', email: 'email.address@something.com' }
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('workflow result');
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    test('THEN the workflow is run for index page if directory path is provided', async () => {
      mockExistsFn.mockResolvedValueOnce(true);
      mockRealpathFn.mockResolvedValueOnce('/file/path/index');
      mockStatFn.mockResolvedValueOnce({ isDirectory: vi.fn().mockReturnValue(true) });
      mockTriggerWorkflowFn.mockResolvedValueOnce('workflow result');
      const response = await server.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          user: { name: 'David Reid', email: 'email.address@something.com' },
          route: '/file/path',
          markdown: '### This is a title',
          name: 'save'
        }
      });

      expect(mockExistsFn).toBeCalledTimes(1);
      expect(mockRealpathFn).toBeCalledTimes(1);
      expect(mockRealpathFn.mock.calls[0][0]).toEqual('/file/path/index');
      expect(mockStatFn).toBeCalledTimes(1);
      expect(mockTriggerWorkflowFn).toBeCalledTimes(1);
      expect(mockTriggerWorkflowFn.mock.calls[0][0]).toEqual('save');
      expect(mockTriggerWorkflowFn.mock.calls[0][1]).toEqual('/file/path/index');
      expect(mockTriggerWorkflowFn.mock.calls[0][2]).toEqual({
        markdown: '### This is a title',
        user: { name: 'David Reid', email: 'email.address@something.com' }
      });
      expect(response.statusCode).toEqual(200);
      expect(response.payload).toEqual('workflow result');
      expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    });

    test('THEN the workflow is not run without providing the workflow name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          user: { name: 'David Reid', email: 'email.address@something.com' },
          route: '/file/path',
          markdown: '### This is a title'
        }
      });

      expect(mockTriggerWorkflowFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(500);
      expect(response.payload).toEqual('Workflow name is required');
      expect(response.headers['content-type']).toEqual('application/text');
    });

    test('THEN the workflow is not run if the page does not exist', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/workflows',
        payload: {
          user: { name: 'David Reid', email: 'email.address@something.com' },
          route: '/file/path',
          markdown: '### This is a title',
          name: 'save'
        }
      });

      expect(mockTriggerWorkflowFn).toBeCalledTimes(0);
      expect(response.statusCode).toEqual(404);
      expect(response.payload).toEqual('/file/path not found');
      expect(response.headers['content-type']).toEqual('application/text');
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
