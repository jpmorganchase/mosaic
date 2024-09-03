import { Observable, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ReadmePage } from '../types/index.js';

import Source from '../index.js';

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 0
};

const options = {
  prefixDir: 'prefixDir',
  accessToken: 'Bearer mytoken',
  readme: [
    {
      name: 'some-page-name-1',
      readmeUrl: 'https://some/url/for/readme1.md',
      contentTemplate: '<div>::content::</div>',
      meta: {
        layout: 'DetailTechnical',
        title: 'some title 1',
        description: 'some description 1',
        tags: ['some-tag-1'],
        data: {
          repoUrl: 'https://some/repo/url/1'
        }
      }
    },
    {
      name: 'some-page-name-2',
      readmeUrl: 'https://some/url/for/readme2.md',
      // proxyEndpoint: 'http://proxy.jpmchase.net:8443',
      contentTemplate: '<div>::content::</div>',
      meta: {
        layout: 'DetailTechnical',
        title: 'some title 2',
        description: 'some description 2',
        tags: ['some-tag-2'],
        data: {
          repoUrl: 'https://some/repo/url/2'
        }
      }
    }
  ]
};

const createResponse = (index: number) => `some readme.md for request ${index}`;

const createExpectedResult = (index: number) => ({
  title: `some title ${index}`,
  description: `some description ${index}`,
  layout: 'DetailTechnical',
  route: `prefixDir/some-page-name-${index}`,
  fullPath: `prefixDir/some-page-name-${index}.mdx`,
  tags: [`some-tag-${index}`],
  data: {
    title: `some title ${index}`,
    description: `some description ${index}`,
    readmeUrl: `https://some/url/for/readme${index}.md`,
    link: `prefixDir/some-page-name-${index}`,
    repoUrl: `https://some/repo/url/${index}`
  },
  content: `<div>some readme.md for request ${index}</div>`
});

const successHandlers = [
  http.get('https://some/url/for/readme1.md', () => {
    return HttpResponse.text(createResponse(1));
  }),
  http.get('https://some/url/for/readme2.md', () => {
    return HttpResponse.text(createResponse(2));
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

    it('should return pages', done => {
      const source$: Observable<ReadmePage[]> = Source.create(options, { schedule });
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
