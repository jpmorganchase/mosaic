import { describe, it, expect, afterEach, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { fromHttpRequest, isErrorResponse } from '../fromHttpRequest.js';

const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

const testUrl = 'http://host.test.com';

interface Data {
  name: string;
  sid: string;
}

const successfulRequestHandler = http.get(testUrl, () => {
  return HttpResponse.json({ name: 'David', sid: 'some id' });
});

const notOKHandler = http.get(testUrl, () => {
  return new HttpResponse(null, { status: 404 });
});

const errorHandler = http.get(testUrl, () => {
  return HttpResponse.error();
});

const successfulTextContentTypeRequestHandler = http.get(testUrl, () => {
  return HttpResponse.text('David');
});

const successfulDefaultContentTypeRequestHandler = http.get(testUrl, () => {
  return HttpResponse.json({ name: 'David', sid: 'some id' });
});

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  consoleErrorMock.mockRestore();
});

describe('GIVEN a fromHttpRequest helper ', () => {
  describe('WHEN a successful request is made', () => {
    beforeEach(() => {
      server.resetHandlers(successfulRequestHandler);
    });
    it('JSON is returned', () =>
      new Promise<void>(done => {
        const fromHttpRequest$ = fromHttpRequest<Data>(testUrl);

        fromHttpRequest$.subscribe({
          next: response => {
            expect(response).toEqual({ name: 'David', sid: 'some id' });
          },
          complete: () => done()
        });
      }));

    describe('AND WHEN a text content-type header is found', () => {
      beforeEach(() => {
        server.resetHandlers(successfulTextContentTypeRequestHandler);
      });
      it('TEXT is returned', () =>
        new Promise<void>(done => {
          const fromHttpRequest$ = fromHttpRequest<string>(testUrl);

          fromHttpRequest$.subscribe({
            next: response => {
              expect(response).toEqual('David');
            },
            complete: () => done()
          });
        }));
    });

    describe('AND WHEN a **NO** content-type header is found', () => {
      beforeEach(() => {
        server.resetHandlers(successfulDefaultContentTypeRequestHandler);
      });
      it('JSON is returned', () =>
        new Promise<void>(done => {
          const fromHttpRequest$ = fromHttpRequest<string>(testUrl);

          fromHttpRequest$.subscribe({
            next: response => {
              expect(response).toEqual({ name: 'David', sid: 'some id' });
            },
            complete: () => done()
          });
        }));
    });
  });

  describe('WHEN the fetch throws an error', () => {
    beforeEach(() => {
      server.resetHandlers(errorHandler);
    });
    it('An Error Response is returned', () =>
      new Promise<void>(done => {
        const fromHttpRequest$ = fromHttpRequest<Data>(testUrl);

        fromHttpRequest$.subscribe({
          next: response => {
            expect(response).toEqual({
              error: true,
              message: 'Failed to fetch'
            });
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN a unsuccessful request is made', () => {
    beforeEach(() => {
      server.resetHandlers(notOKHandler);
    });
    it('An ErrorResponse is returned', () =>
      new Promise<void>(done => {
        const fromHttpRequest$ = fromHttpRequest<Data>(testUrl);

        fromHttpRequest$.subscribe({
          next: response => {
            expect(response).toEqual({ error: true, message: 'Error 404' });
          },
          complete: () => done()
        });
      }));
  });
});

describe('GIVEN the `isErrorResponse` function', () => {
  describe('WHEN the response is **not** an error', () => {
    it('THEN it returns false', () => {
      expect(isErrorResponse('test')).toEqual(false);
    });
  });
  describe('WHEN the response **is** an error', () => {
    it('THEN it returns false', () => {
      expect(isErrorResponse({ error: true, message: 'message' })).toEqual(true);
    });
  });
});
