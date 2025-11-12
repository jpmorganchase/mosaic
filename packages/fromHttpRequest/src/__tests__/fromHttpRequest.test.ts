import { describe, it, expect, afterEach, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import {
  fromHttpRequest,
  isFromHttpRequestError,
  isFromHttpRequestThrownError
} from '../fromHttpRequest.js';

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
  return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
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

    describe('AND WHEN a no content-type header is found', () => {
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
    it('A thrown Error response is returned', () =>
      new Promise<void>(done => {
        const fromHttpRequest$ = fromHttpRequest<Data>(testUrl);

        fromHttpRequest$.subscribe({
          next: response => {
            expect(response).toMatchObject({
              error: true,
              kind: 'thrown',
              message: expect.any(String)
            });
            expect(isFromHttpRequestThrownError(response)).toBe(true);
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN an unsuccessful request is made', () => {
    beforeEach(() => {
      server.resetHandlers(notOKHandler);
    });
    it('An HTTP ErrorResponse is returned', () =>
      new Promise<void>(done => {
        const fromHttpRequest$ = fromHttpRequest<Data>(testUrl);

        fromHttpRequest$.subscribe({
          next: response => {
            expect(response).toMatchObject({
              error: true,
              kind: 'http',
              message: expect.stringContaining(
                'A non-OK HTTP response was received from the server'
              ),
              status: 404,
              statusText: 'Not Found',
              headers: expect.any(Object)
            });
            expect(isFromHttpRequestError(response)).toBe(true);
          },
          complete: () => done()
        });
      }));
  });
});

describe('GIVEN the `isFromHttpRequestError` and `isFromHttpRequestThrownError` functions', () => {
  describe('WHEN the response is not an error', () => {
    it('THEN isFromHttpRequestError returns false', () => {
      expect(isFromHttpRequestError('test')).toEqual(false);
    });
    it('THEN isFromHttpRequestThrownError returns false', () => {
      expect(isFromHttpRequestThrownError('test')).toEqual(false);
    });
  });
  describe('WHEN the response is an http error', () => {
    it('THEN isFromHttpRequestError returns true', () => {
      expect(
        isFromHttpRequestError({
          error: true,
          kind: 'http',
          message: 'message',
          status: 404,
          statusText: 'Not Found',
          headers: {}
        })
      ).toEqual(true);
    });
    it('THEN isFromHttpRequestThrownError returns false', () => {
      expect(
        isFromHttpRequestThrownError({
          error: true,
          kind: 'http',
          message: 'message',
          status: 404,
          statusText: 'Not Found',
          headers: {}
        })
      ).toEqual(false);
    });
  });
  describe('WHEN the response is a thrown error', () => {
    it('THEN isFromHttpRequestThrownError returns true', () => {
      expect(
        isFromHttpRequestThrownError({
          error: true,
          kind: 'thrown',
          message: 'message'
        })
      ).toEqual(true);
    });
    it('THEN isFromHttpRequestError returns false', () => {
      expect(
        isFromHttpRequestError({
          error: true,
          kind: 'thrown',
          message: 'message'
        })
      ).toEqual(false);
    });
  });
});
