import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { StorybookPage } from '../types/index.js';

import Source from '../index.js';

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 0
};

const options = {
  prefixDir: 'prefixDir',
  requestTimeout: 1000,
  stories: [
    {
      description: 'some description 1',
      url: 'https://api.endpoint.com/1',
      additionalData: { owner: 'some owner 1' },
      additionalTags: ['some-additional-tag-1'],
      filter: /TestComponent\/SomePath\/Component/
    },
    {
      description: 'some description 2',
      url: 'https://api.endpoint.com/2',
      additionalData: { owner: 'some owner 2' },
      additionalTags: ['some-additional-tag-2'],
      filterTags: ['tag-2']
    },
    {
      description: 'some description 3',
      url: 'https://api.endpoint.com/3',
      additionalData: { owner: 'some owner 3' },
      additionalTags: ['some-additional-tag-3'],
      filter: /IgnoredComponent\/SomePath\/Component/
    }
  ]
};

const createResponse = (index: number) => ({
  stories: {
    [`component${index}`]: {
      id: `component${index}Id`,
      title: `Component ${index} Title`,
      name: `Component ${index} Name`,
      importPath: `./some-path/to/component-${index}`,
      tags: ['tag-1', 'tag-2'],
      storiesImports: [],
      kind: `TestComponent/SomePath/Component-${index}`,
      story: `Docs ${index}`
    }
  }
});

const createExpectedResult = (index: number) => ({
  title: `TestComponent/SomePath/Component-${index} - Component ${index} Name`,
  layout: 'DetailTechnical',
  route: `prefixDir/component${index}Id`,
  fullPath: `prefixDir/component${index}Id.mdx`,
  tags: [`some-additional-tag-${index}`],
  data: {
    id: `component${index}Id`,
    description: `some description ${index}`,
    kind: `TestComponent/SomePath/Component-${index}`,
    link: `https://api.endpoint.com/${index}/iframe.html?id=component${index}Id&viewMode=story&shortcuts=false&singleStory=true`,
    name: `Component ${index} Name`,
    owner: `some owner ${index}`,
    source: 'STORYBOOK',
    story: `Docs ${index}`
  },
  content: ''
});

const successHandlers = [
  rest.get(`${options.stories[0].url}/stories.json`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createResponse(1)));
  }),
  rest.get(`${options.stories[1].url}/stories.json`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createResponse(2)));
  }),
  rest.get(`${options.stories[2].url}/stories.json`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createResponse(3)));
  })
];

describe('GIVEN a Storybook Source ', () => {
  describe.only('WHEN a fetch is successful', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(...successHandlers);
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });

    it('should filter results from all stories into 1 array', done => {
      const source$: Observable<StorybookPage[]> = Source.create(options, { schedule });
      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result.length).toEqual(2);
        },
        complete: () => done()
      });
    });

    it('should return pages for matching filter', done => {
      const source$: Observable<StorybookPage[]> = Source.create(options, { schedule });
      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0]).toEqual(createExpectedResult(1));
          expect(result[1]).toEqual(createExpectedResult(2));
        },
        complete: () => done()
      });
    });
  });
});
