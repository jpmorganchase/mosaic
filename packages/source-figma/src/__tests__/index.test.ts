import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
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

const createProjectsResponse = (fileId: string) => ({
  name: 'Figma Test Patterns',
  files: [
    {
      key: fileId
    }
  ]
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
  layout: 'DetailTechnical',
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
    source: 'FIGMA',
    tags: 'some-tag1,some-tag2',
    version: 'some version',
    ...data.data
  },
  content: ''
});

const successHandlers = [
  // Projects
  rest.get('https://myfigma.com/getproject/:project_id/*', (req, res, ctx) => {
    const { project_id } = req.params;
    const fileId = project_id === '888' ? 'file888' : 'file999';
    return res(ctx.status(200), ctx.json(createProjectsResponse(fileId)));
  }),
  // Files
  rest.get('https://myfigma.com/getfile/:file_id', (req, res, ctx) => {
    const { file_id } = req.params;
    const pattern =
      file_id === 'file888' ? 'jpmSaltPattern_888_pattern1' : 'jpmSaltPattern_999_pattern2';
    return res(ctx.status(200), ctx.json(createProjectFilesResponse(pattern, '2:0')));
  }),
  // Thumbnails
  rest.get('https://myfigma.com/generatethumb/:project_id', (req, res, ctx) => {
    const { project_id } = req.params;
    const url = new URL(req.url);
    const nodeId = url.searchParams.get('ids') as string;
    return res(
      ctx.status(200),
      ctx.json({
        images: { [nodeId]: `/thumbnail/${project_id}/${nodeId}` }
      })
    );
  })
];
describe('GIVEN a Figma Source ', () => {
  describe('WHEN a fetch is successful', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(...successHandlers);
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });

    it('should return the 2 patterns for the 2 subscribed projects', done => {
      const source$: Observable<FigmaPage[]> = Source.create(options, { schedule });
      source$.pipe(take(1)).subscribe({
        next: result => {
          const meta0: Record<string, any> = {
            ...getProjectById(888).meta,
            tags: ['some-tag1', 'some-tag2', ...getProjectById(888).meta.tags]
          };
          meta0.data = {
            ...meta0.data,
            thumbnailUrl: `/thumbnail/file888/2:0`,
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
            thumbnailUrl: `/thumbnail/file999/2:0`,
            projectId: '999'
          };
          expect(result[1]).toEqual(createExpectedResult('jpmSaltPattern_999_pattern2', meta1));
        },
        complete: () => done()
      });
    });
  });
});
