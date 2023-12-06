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
      meta: {
        layout: 'layout project 1',
        data: { owner: 'owner project 1' },
        tags: ['additional-tag-1']
      }
    },
    {
      id: 999,
      meta: {
        layout: 'layout project 2',
        data: { owner: 'owner project 2' },
        tags: ['additional-tag-2']
      }
    }
  ],
  endpoints: {
    getProject: 'https://myfigma/:project_id/files',
    getFile: 'https://myfigma/:file_id?plugin_data=shared'
  }
};

const getProjectById = (id: number) =>
  options.projects.find(item => item.id === id) || { meta: { tags: [] } };

const createProjectsResponse = (patternId: string) => [
  {
    name: 'Figma Test Patterns',
    files: [
      {
        key: patternId
      }
    ]
  }
];
const createProjectFilesResponse = (patternId: string) => ({
  document: {
    sharedPluginData: {
      [`jpmSaltPattern.${patternId}`]: {
        description: `some description for ${patternId}`,
        link: 'some link',
        name: patternId,
        node: 'X:Y',
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
  route: `/prefixdir/jpmsaltpattern_${patternId}`,
  fullPath: `/prefixdir/jpmsaltpattern_${patternId}.mdx`,
  tags: ['some-tag1', 'some-tag2'],
  ...data,
  data: {
    description: `some description for ${patternId}`,
    embedLink: 'some embed link',
    link: 'some link',
    node: 'X:Y',
    name: patternId,
    patternId: `jpmSaltPattern.${patternId}`,
    source: 'FIGMA',
    tags: 'some-tag1,some-tag2',
    version: 'some version',
    ...data.data
  },
  content: ''
});

const successHandlers = [
  // Project 1 - pattern 1
  rest.get(`${options.endpoints.getProject}`.replace(':project_id', '888'), (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createProjectsResponse('pattern1')));
  }),
  rest.get(
    `${options.endpoints.getFile.replace(':file_id', 'pattern1')}?plugin_data=shared`,
    (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json(createProjectFilesResponse('pattern1')));
    }
  ),
  // Project 2 - pattern 2
  rest.get(`${options.endpoints.getProject}`.replace(':project_id', '999'), (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createProjectsResponse('pattern2')));
  }),
  rest.get(
    `${options.endpoints.getFile.replace(':file_id', 'pattern2')}?plugin_data=shared`,
    (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json(createProjectFilesResponse('pattern2')));
    }
  )
];
//myfigma/pattern1?plugin_data=shared
https: describe('GIVEN a Figma Source ', () => {
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
          expect(result[0]).toEqual(
            createExpectedResult('pattern1', {
              ...getProjectById(888).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(888).meta.tags]
            })
          );
          expect(result[1]).toEqual(
            createExpectedResult('pattern2', {
              ...getProjectById(999).meta,
              tags: ['some-tag1', 'some-tag2', ...getProjectById(999).meta.tags]
            })
          );
        },
        complete: () => done()
      });
    });
  });
});
