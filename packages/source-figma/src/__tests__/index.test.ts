import { describe, expect, it, afterAll, afterEach, beforeAll } from 'vitest';
import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { FigmaPage } from '../types/index.js';

import Source from '../index.js';

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 0
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
  }
};

const getProjectById = (id: number) =>
  options.projects.find(item => item.id === id) || { meta: { tags: [] } };

const createProjectsResponse = (fileIds: string[]) => ({
  name: 'Figma Test Patterns',
  files: fileIds.map(fileId => ({
    key: fileId
  }))
});

const createProjectFilesResponse = (patternId: string, nodeId: string) => ({
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
  }
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

const successHandlers = [
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
    return HttpResponse.json(createProjectFilesResponse(pattern, '2:0'));
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

const multiHandlers = [
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
    return HttpResponse.json(createProjectFilesResponse(pattern, '2:0'));
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
});

describe('GIVEN a Figma Source ', () => {
  describe('WHEN a fetch is successful', () => {
    it('should return the 2 patterns for the 2 subscribed projects', () =>
      new Promise<void>(done => {
        server.resetHandlers(...successHandlers);

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
              projectId: '999'
            };
            expect(result[1]).toEqual(createExpectedResult('jpmSaltPattern_999_pattern2', meta1));
          },
          complete: () => done()
        });
      }));

    it('should support multiple files', () =>
      new Promise<void>(done => {
        server.resetHandlers(...multiHandlers);

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
              contentUrl: `/thumbnail/file222/2:0`,
              projectId: '888'
            };
            expect(result[1]).toEqual(createExpectedResult('jpmSaltPattern_222_pattern1', meta1));
          },
          complete: () => done()
        });
      }));
  });
});
