import 'event-target-polyfill';
import 'yet-another-abortcontroller-polyfill';
import { defer, from, Observable, ObservableInput, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import contentTypeParser from 'fast-content-type-parse';
import { Request } from 'undici';

import { fromFetch } from './fromFetch.js';

/**
 * Error raised when there an error is thrown
 */
export interface FromHttpRequestThrownError {
  error: true;
  kind: 'thrown';
  message: string;
}

/**
 * Error raised when there is a network/http error
 */
export interface FromHttpRequestHttpError {
  error: true;
  kind: 'http';
  message: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export type FromHttpRequestError = FromHttpRequestThrownError | FromHttpRequestHttpError;

export function isFromHttpRequestError(response: any): response is FromHttpRequestError {
  return (
    !!(response as FromHttpRequestError).error && (response as FromHttpRequestError).kind === 'http'
  );
}

export function isFromHttpRequestThrownError(
  response: any
): response is FromHttpRequestThrownError {
  return (
    !!(response as FromHttpRequestThrownError).error &&
    (response as FromHttpRequestThrownError).kind === 'thrown'
  );
}

export interface FromHttpRequestOptions {
  /**
   * Abort the request if the full response (headers and body) hasn't
   * arrived within this many milliseconds. The timer starts on
   * subscribe, so every subscription gets a fresh timeout.
   */
  timeout?: number;
}

function parseResponse<TData>(
  response: Response
): ObservableInput<TData | FromHttpRequestHttpError> {
  if (response.ok) {
    const contentTypeHeader = response.headers.get('content-type') || '';
    const contentType = contentTypeParser.safeParse(contentTypeHeader).type;
    if (contentType.includes('text')) {
      return from(response.text() as Promise<TData>);
    }
    // default to json
    return from(response.json() as Promise<TData>);
  }
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return of<FromHttpRequestHttpError>({
    error: true,
    kind: 'http',
    message: `A non-OK HTTP response was received from the server: ${response.status}/${response.statusText}`,
    status: response.status,
    statusText: response.statusText,
    headers: headersObj
  });
}

/**
 *
 * @param input The resource you would like to fetch. Can be a url or a request object.
 * @param options Request options, e.g. `timeout`.
 * @returns Observable of JSON or ErrorResponse
 */
export function fromHttpRequest<TData>(
  input: string | Request,
  { timeout }: FromHttpRequestOptions = {}
): Observable<TData | FromHttpRequestError> {
  return defer(() => {
    // rxjs `fromFetch` replaces the Request's own signal with one it
    // controls and only follows `init.signal`, so the timeout must be
    // passed here. `selector` keeps the request abortable while the body
    // is read; without it rxjs stops listening once headers arrive.
    const signal = timeout ? AbortSignal.timeout(timeout) : undefined;
    return fromFetch(input, { signal, selector: parseResponse<TData> }).pipe(
      catchError(error =>
        // Network or thrown error
        of<FromHttpRequestThrownError>({
          error: true,
          kind: 'thrown',
          message: signal?.aborted ? `Request timed out after ${timeout}ms` : error.message
        })
      )
    );
  });
}
