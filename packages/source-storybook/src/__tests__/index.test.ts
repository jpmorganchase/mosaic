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
      storiesUrl: 'https://api.endpoint.com/1',
      storyUrlPrefix: 'https://storybook.endpoint.com/1',
      meta: { tags: ['some-additional-tag-1'], data: { owner: 'some owner 1' } },
      filter: /TestComponent\/SomePath\/Component/
    },
    /**
     * Will be filter by filterTags
     */
    {
      description: 'some description 2',
      storiesUrl: 'https://api.endpoint.com/2',
      storyUrlPrefix: 'https://storybook.endpoint.com/2',
      meta: { tags: ['some-additional-tag-2'], data: { owner: 'some owner 2' } },
      filterTags: ['tag-2']
    },
    /**
     * Will be filter by filter regex
     */
    {
      description: 'some description 3',
      storiesUrl: 'https://api.endpoint.com/3',
      storyUrlPrefix: 'https://storybook.endpoint.com/3',
      meta: { tags: ['some-additional-tag-3'], data: { owner: 'some owner 3' } },
      filter: /IgnoredComponent\/SomePath\/Component/
    },
    {
      description: 'some description 4',
      storiesUrl: 'https://api.endpoint.com/4',
      storyUrlPrefix: 'https://storybook.endpoint.com/4',
      meta: { tags: ['some-additional-tag-4'], data: { owner: 'some owner 4' } },
      filter: /TestComponent\/SomePath\/Component/
    },
    /**
     * No additional data or tags
     */
    {
      description: 'some description 5',
      storiesUrl: 'https://api.endpoint.com/5',
      storyUrlPrefix: 'https://storybook.endpoint.com/5',
      filter: /TestComponent\/SomePath\/Component/
    }
  ]
};

const createStoriesResponse = (index: number) => ({
  v: 3,
  stories: {
    [`component${index}`]: {
      id: `component${index}Id`,
      name: `Component ${index} Name`,
      title: `TestComponent/SomePath/Component-${index}`,
      importPath: `./some-path/to/component-${index}`,
      tags: ['tag-1', 'tag-2'],
      kind: `TestComponent/SomePath/Component-${index}`,
      story: `Docs ${index}`,
      parameters: {}
    }
  }
});

const createIndexResponse = (index: number) => ({
  v: 5,
  entries: {
    [`component${index}`]: {
      type: `story`,
      id: `component${index}Id`,
      name: `Component ${index} Name`,
      title: `TestComponent/SomePath/Component-${index}`,
      importPath: `./some-path/to/component-${index}`,
      tags: ['tag-1', 'tag-2']
    }
  }
});

const createExpectedResult = (index: number) => ({
  title: `TestComponent/SomePath/Component-${index} - Component ${index} Name`,
  route: `prefixDir/component${index}Id`,
  fullPath: `prefixDir/component${index}Id.json`,
  tags: [`some-additional-tag-${index}`],
  data: {
    type: 'story',
    id: `component${index}Id`,
    contentUrl: `https://storybook.endpoint.com/${index}/iframe.html?id=component${index}Id&viewMode=story&shortcuts=false&singleStory=true`,
    description: `some description ${index}`,
    title: `TestComponent/SomePath/Component-${index}`,
    link: `https://storybook.endpoint.com/${index}?id=component${index}Id`,
    name: `Component ${index} Name`,
    owner: `some owner ${index}`
  }
});

const successHandlers = [
  rest.get(options.stories[0].storiesUrl, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createStoriesResponse(1)));
  }),
  rest.get(options.stories[1].storiesUrl, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createIndexResponse(2)));
  }),
  rest.get(options.stories[2].storiesUrl, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createStoriesResponse(3)));
  }),
  rest.get(options.stories[3].storiesUrl, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createIndexResponse(4)));
  }),
  rest.get(options.stories[4].storiesUrl, (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(createStoriesResponse(5)));
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
