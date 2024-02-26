import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { StorybookPage } from '../types/index.js';

import Source, { StorybookSourceOptions } from '../index.js';

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 0
};

const options: StorybookSourceOptions = {
  prefixDir: 'prefixDir',
  requestTimeout: 1000,
  stories: [
    {
      description: 'some description 1',
      url: 'https://api.endpoint.com/1',
      meta: { tags: ['some-additional-tag-1'], data: { owner: 'some owner 1' } },
      filter: /TestComponent\/SomePath\/Component/
    },
    /**
     * Will be filter by filterTags
     */
    {
      description: 'some description 2',
      url: 'https://api.endpoint.com/2',
      meta: { tags: ['some-additional-tag-2'], data: { owner: 'some owner 2' } },
      filterTags: ['tag-2']
    },
    /**
     * Will be filter by filter regex
     */
    {
      description: 'some description 3',
      url: 'https://api.endpoint.com/3',
      meta: { tags: ['some-additional-tag-3'], data: { owner: 'some owner 3' } },
      filter: /IgnoredComponent\/SomePath\/Component/
    },
    {
      description: 'some description 4',
      url: 'https://api.endpoint.com/4',
      meta: { tags: ['some-additional-tag-4'], data: { owner: 'some owner 4' } },
      filter: /TestComponent\/SomePath\/Component/
    },
    /**
     * No additional data or tags
     */
    {
      description: 'some description 5',
      url: 'https://api.endpoint.com/5',
      filter: /TestComponent\/SomePath\/Component/
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
  route: `prefixDir/component${index}Id`,
  fullPath: `prefixDir/component${index}Id.json`,
  tags: [`some-additional-tag-${index}`],
  data: {
    id: `component${index}Id`,
    description: `some description ${index}`,
    kind: `TestComponent/SomePath/Component-${index}`,
    link: `https://api.endpoint.com/${index}/iframe.html?id=component${index}Id&viewMode=story&shortcuts=false&singleStory=true`,
    name: `Component ${index} Name`,
    owner: `some owner ${index}`,
    story: `Docs ${index}`
  }
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
  }),
  rest.get(`${options.stories[3].url}/stories.json`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createResponse(4)));
  }),
  rest.get(`${options.stories[4].url}/stories.json`, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createResponse(5)));
  })
];

describe('GIVEN a Storybook Source ', () => {
  describe('WHEN a fetch is successful', () => {
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
          // 5 stories, 1 filtered by `filter` and another by `filterTags`
          expect(result.length).toEqual(options.stories.length - 2);
        },
        complete: () => done()
      });
    });

    it('should return pages for matching filter', done => {
      const source$: Observable<StorybookPage[]> = Source.create(options, { schedule });
      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0]).toEqual(createExpectedResult(1));
          expect(result[1]).toEqual(createExpectedResult(4));

          const result5 = createExpectedResult(5);
          delete result5.tags; // no tags data added for this result5
          delete result5.data.owner; // no additional data added for result5
          expect(result[2]).toEqual(result5);
        },
        complete: () => done()
      });
    });
  });
});
