import { describe, expect, test, afterAll, afterEach, beforeAll, vi } from 'vitest';
import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { FigmaPage } from '../types/index.js';
import { vol, fs } from 'memfs';
import path from 'path';

vi.mock(import('fs'), async () => {
  return { default: fs, existsSync: fs.existsSync, mkdirSync: fs.mkdirSync };
});

import Source from '../index.js';

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 0
};

const cacheDir = '/memfs-cache';
const cacheOptions = {
  ttl: 24 * 60 * 60 * 1000, // 1 day
  dir: cacheDir
};

const options = {
  requestTimeout: 1000,
  prefixDir: '/prefixDir',
  figmaToken: 'someFigmaToken',
  projects: [
    {
      id: 888,
      patternPrefix: 'jpmSaltPattern',
      meta: {
        layout: 'layout project 1',
        data: { owner: 'owner project 1' },
        tags: ['additional-tag-1']
      }
    },
    {
      id: 999,
      patternPrefix: 'jpmSaltPattern',
      meta: {
        layout: 'layout project 2',
        data: { owner: 'owner project 2' },
        tags: ['additional-tag-2']
      }
    }
  ],
  endpoints: {
    getProject: 'https://myfigma.com/getproject/:project_id/files',
    getFile: 'https://myfigma.com/getfile/:file_id?plugin_data=shared',
    generateThumbnail: 'https://myfigma.com/generatethumb/:project_id?ids=:node_id'
  },
  cache: cacheOptions
};

const getProjectById = (id: number) =>
  options.projects.find(item => item.id === id) || { meta: { tags: [] } };

const createProjectsResponse = (fileIds: string[]) => ({
  name: 'Figma Test Patterns',
  files: fileIds.map(fileId => ({
    key: fileId
  }))
});

const createProjectFilesResponse = (patternId: string, nodeId: string, lastModified: string) => ({
  document: {
    sharedPluginData: {
      [patternId]: {
        description: `some description for ${patternId}`,
        link: 'some link',
        name: patternId,
        nodeId,
        embedLink: 'some embed link',
        tags: 'some-tag1,some-tag2',
        version: 'some version'
      }
    }
  },
  lastModified
});

const createExpectedResult = (patternId: string, data: Record<string, any>) => ({
  title: patternId,
  description: `some description for ${patternId}`,
  route: `/prefixdir/${patternId}`.toLowerCase(),
  fullPath: `/prefixdir/${patternId}.json`.toLowerCase(),
  tags: ['some-tag1', 'some-tag2'],
  ...data,
  data: {
    description: `some description for ${patternId}`,
    embedLink: 'some embed link',
    link: 'some link',
    nodeId: '2:0',
    name: patternId,
    patternId: patternId,
    version: 'some version',
    ...data.data
  },
  content: ''
});

const createSuccessHandlers = (lastModified: string) => [
  // Projects
  http.get('https://myfigma.com/getproject/:project_id/*', info => {
    const { project_id } = info.params;
    const fileId = project_id === '888' ? ['file888'] : ['file999'];
    return HttpResponse.json(createProjectsResponse(fileId));
  }),
  // Files
  http.get('https://myfigma.com/getfile/:file_id', info => {
    const { file_id } = info.params;
    const pattern =
      file_id === 'file888' ? 'jpmSaltPattern_888_pattern1' : 'jpmSaltPattern_999_pattern2';
    return HttpResponse.json(createProjectFilesResponse(pattern, '2:0', lastModified));
  }),
  // Thumbnails
  http.get('https://myfigma.com/generatethumb/:project_id', info => {
    const { project_id } = info.params;
    const url = new URL(info.request.url);
    const nodeId = url.searchParams.get('ids') as string;
    return HttpResponse.json({
      images: { [nodeId]: `/thumbnail/${project_id}/${nodeId}` }
    });
  })
];

const createMultiHandlers = (lastModified: string) => [
  // Projects
  http.get('https://myfigma.com/getproject/:project_id/*', info => {
    const { project_id } = info.params;
    const fileIds = project_id === '888' ? ['file111', 'file222'] : [];
    return HttpResponse.json(createProjectsResponse(fileIds));
  }),
  // Files
  http.get('https://myfigma.com/getfile/:file_id', info => {
    const { file_id } = info.params;
    const title = file_id.toString().replace('file', '');
    const pattern = `jpmSaltPattern_${title}_pattern1`;
    return HttpResponse.json(createProjectFilesResponse(pattern, '2:0', lastModified));
  }),
  // Thumbnails
  http.get('https://myfigma.com/generatethumb/:project_id', info => {
    const { project_id } = info.params;
    const url = new URL(info.request.url);
    const nodeId = url.searchParams.get('ids') as string;
    return HttpResponse.json({
      images: { [nodeId]: `/thumbnail/${project_id}/${nodeId}` }
    });
  })
];

const server = setupServer();

afterAll(() => {
  server.close();
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  vol.reset();
});

describe('GIVEN a Figma Source ', () => {
  describe('WITH thumbnail cache', () => {
    test('should cache thumbnails and use them on subsequent fetches', async () => {
      const lastModified = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      server.resetHandlers(...createSuccessHandlers(lastModified));

      // First fetch: should call thumbnail API and cache the result
      const source$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
      await new Promise<void>(done => {
        source$.pipe(take(1)).subscribe({
          next: result => {
            // Check that the thumbnail is present
            expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0');
            expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0');
            // Check that cache file exists for file888
            const cacheFilePath = path.join(cacheDir, 'thumbnail-file888.json');
            expect(fs.existsSync(cacheFilePath)).toBe(true);
          },
          complete: () => done()
        });
      });

      // Simulate server returning an error for thumbnails (should use cache instead)
      server.use(
        http.get('https://myfigma.com/generatethumb/:project_id', () => {
          return HttpResponse.json({ images: {}, err: 'rate limit' });
        })
      );

      // Second fetch: should use cached thumbnails, not call thumbnail API
      const source2$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
      await new Promise<void>(done => {
        source2$.pipe(take(1)).subscribe({
          next: result => {
            // Should still have the cached thumbnail URLs
            expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0');
            expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0');
          },
          complete: () => done()
        });
      });
    });
  });

  test('should update cached thumbnail when page lastModified changes', async () => {
    const lastModified = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    server.resetHandlers(...createSuccessHandlers(lastModified));

    // Step 1: Initial fetch with old lastModified and thumbnail
    const source$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
    await new Promise<void>(done => {
      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0');
          expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0');
          // Cache file should exist
          const cacheFilePath888 = path.join(cacheDir, 'thumbnail-file888.json');
          expect(fs.existsSync(cacheFilePath888)).toBe(true);
          const cacheFilePath999 = path.join(cacheDir, 'thumbnail-file999.json');
          expect(fs.existsSync(cacheFilePath999)).toBe(true);
          done();
        }
      });
    });

    // Step 2: Update lastModified to a more recent datestamp and return a new thumbnail URL
    const newLastModified = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    server.use(
      // Files handler with new lastModified
      http.get('https://myfigma.com/getfile/:file_id', info => {
        const { file_id } = info.params;
        const pattern =
          file_id === 'file888' ? 'jpmSaltPattern_888_pattern1' : 'jpmSaltPattern_999_pattern2';
        return HttpResponse.json({
          document: {
            sharedPluginData: {
              [pattern]: {
                description: `some description for ${pattern}`,
                link: 'some link',
                name: pattern,
                nodeId: '2:0',
                embedLink: 'some embed link',
                tags: 'some-tag1,some-tag2',
                version: 'some version'
              }
            }
          },
          lastModified: newLastModified
        });
      }),
      // Thumbnails handler returns a new URL
      http.get('https://myfigma.com/generatethumb/:project_id', info => {
        const { project_id } = info.params;
        const url = new URL(info.request.url);
        const nodeId = url.searchParams.get('ids') as string;
        return HttpResponse.json({
          images: { [nodeId]: `/thumbnail/${project_id}/${nodeId}-new` }
        });
      })
    );

    // Step 3: Fetch again, should update cache and return new thumbnail URL
    const source2$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
    await new Promise<void>(done => {
      source2$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0-new');
          expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0-new');
          // Cache file should be updated
          const cacheFilePath888 = path.join(cacheDir, 'thumbnail-file888.json');
          const cacheContent888 = fs.readFileSync(cacheFilePath888, 'utf8');
          expect(cacheContent888).toContain('/thumbnail/file888/2:0-new');
          const cacheFilePath999 = path.join(cacheDir, 'thumbnail-file999.json');
          const cacheContent999 = fs.readFileSync(cacheFilePath999, 'utf8');
          expect(cacheContent999).toContain('/thumbnail/file999/2:0-new');
          done();
        }
      });
    });
  });

  describe('WHEN a fetch is successful', () => {
    test('should return the 2 patterns for the 2 subscribed projects', () =>
      new Promise<void>(done => {
        const lastModified = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
        server.resetHandlers(...createSuccessHandlers(lastModified));

        const source$: Observable<FigmaPage[]> = Source.create(options, { schedule });
        source$.pipe(take(1)).subscribe({
          next: result => {
            const meta0: Record<string, any> = {
              ...getProjectById(888).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(888).meta.tags]
            };
            meta0.data = {
              ...meta0.data,
              contentUrl: `/thumbnail/file888/2:0`,
              fileId: 'file888',
              lastModified,
              projectId: '888'
            };
            expect(result[0]).toEqual(createExpectedResult('jpmSaltPattern_888_pattern1', meta0));

            const meta1: Record<string, any> = {
              ...getProjectById(999).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(999).meta.tags]
            };
            meta1.data = {
              ...meta1.data,
              fileId: 'file999',
              contentUrl: `/thumbnail/file999/2:0`,
              lastModified,
              projectId: '999'
            };
            expect(result[1]).toEqual(createExpectedResult('jpmSaltPattern_999_pattern2', meta1));
          },
          complete: () => done()
        });
      }));

    test('should support multiple files', () =>
      new Promise<void>(done => {
        const lastModified = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
        server.resetHandlers(...createMultiHandlers(lastModified));

        const source$: Observable<FigmaPage[]> = Source.create(options, { schedule });
        source$.pipe(take(1)).subscribe({
          next: result => {
            const meta0: Record<string, any> = {
              ...getProjectById(888).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(888).meta.tags]
            };
            meta0.data = {
              ...meta0.data,
              contentUrl: `/thumbnail/file111/2:0`,
              fileId: 'file111',
              lastModified,
              projectId: '888'
            };
            expect(result[0]).toEqual(createExpectedResult('jpmSaltPattern_111_pattern1', meta0));

            const meta1: Record<string, any> = {
              ...getProjectById(888).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(888).meta.tags]
            };
            meta1.data = {
              ...meta1.data,
              fileId: 'file222',
              lastModified,
              contentUrl: `/thumbnail/file222/2:0`,
              projectId: '888'
            };
            expect(result[1]).toEqual(createExpectedResult('jpmSaltPattern_222_pattern1', meta1));
          },
          complete: () => done()
        });
      }));
  });

  test('should invalidate thumbnail cache when TTL is exceeded and fetch new thumbnail', async () => {
    const lastModified = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    server.resetHandlers(...createSuccessHandlers(lastModified));

    // First fetch: cache is populated with the original thumbnail
    const source$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
    await new Promise<void>(done => {
      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0');
          expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0');
          // Cache file should exist
          const cacheFilePath = path.join(cacheDir, 'thumbnail-file888.json');
          expect(fs.existsSync(cacheFilePath)).toBe(true);

          // Manually set cachedAt to an old value (simulate TTL expiry)
          const cacheEntry = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
          cacheEntry.cachedAt = Date.now() - 2 * cacheOptions.ttl;
          fs.writeFileSync(cacheFilePath, JSON.stringify(cacheEntry));
          done();
        }
      });
    });

    // Second fetch: do not update lastModified in the successHandlers but return a new thumbnail
    server.use(
      // Files handler with new lastModified
      http.get('https://myfigma.com/getfile/:file_id', info => {
        const { file_id } = info.params;
        const pattern =
          file_id === 'file888' ? 'jpmSaltPattern_888_pattern1' : 'jpmSaltPattern_999_pattern2';
        return HttpResponse.json({
          document: {
            sharedPluginData: {
              [pattern]: {
                description: `some description for ${pattern}`,
                link: 'some link',
                name: pattern,
                nodeId: '2:0',
                embedLink: 'some embed link',
                tags: 'some-tag1,some-tag2',
                version: 'some version'
              }
            }
          },
          lastModified
        });
      }),
      // Thumbnails handler returns a new URL
      http.get('https://myfigma.com/generatethumb/:project_id', info => {
        const { project_id } = info.params;
        const url = new URL(info.request.url);
        const nodeId = url.searchParams.get('ids') as string;
        return HttpResponse.json({
          images: { [nodeId]: `/thumbnail/${project_id}/${nodeId}-new` }
        });
      })
    );

    // Second fetch: should invalidate cache and return new thumbnail URL
    const source2$: Observable<FigmaPage[]> = Source.create(options, { schedule, fs });
    await new Promise<void>(done => {
      source2$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0].data.contentUrl).toBe('/thumbnail/file888/2:0-new');
          expect(result[1].data.contentUrl).toBe('/thumbnail/file999/2:0');
          // Cache file should be updated
          const cacheFilePath = path.join(cacheDir, 'thumbnail-file888.json');
          const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
          expect(cacheContent).toContain('/thumbnail/file888/2:0-new');
          done();
        }
      });
    });
  });
});
