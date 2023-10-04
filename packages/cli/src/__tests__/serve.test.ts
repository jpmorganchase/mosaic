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
const mockStopSourceFn = jest.fn().mockResolvedValue(true);
const mockAddSourceFn = jest.fn();
const mockRestartSourceFn = jest.fn().mockResolvedValue(true);
const mockListSourcesFn = jest
  .fn()
  .mockResolvedValue(mosaicConfig.sources.map((source, index) => ({ index, ...source })));

jest.mock('@jpmorganchase/mosaic-core', () => {
  return jest.fn().mockImplementation(() => {
    return {
      start: jest.fn(),
      addSource: mockAddSourceFn,
      restartSource: mockRestartSourceFn,
      stopSource: mockStopSourceFn,
      listSources: mockListSourcesFn,
      filesystem: { scope: jest.fn(), toJSON: jest.fn().mockReturnValue(mockFilesystemJSON) }
    };
  });
});

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
});
