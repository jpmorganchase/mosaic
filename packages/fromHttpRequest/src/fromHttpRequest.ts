import 'event-target-polyfill';
import 'yet-another-abortcontroller-polyfill';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import contentTypeParser from 'fast-content-type-parse';

import { fromFetch } from './fromFetch.js';

export type ErrorResponse = { error: boolean; message: string };

export function isErrorResponse<TData>(response: TData | ErrorResponse): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined;
}

/**
 *
 * @param input The resource you would like to fetch. Can be a url or a request object.
 * @returns Observable of JSON or ErrorResponse
 */
export function fromHttpRequest<TData>(input: string | Request): Observable<TData | ErrorResponse> {
  return fromFetch(input).pipe(
    switchMap(response => {
      if (response.ok) {
        const contentTypeHeader = response.headers.get('content-type') || '';
        const contentType = contentTypeParser.safeParse(contentTypeHeader).type;

        if (contentType.includes('json')) {
          return response.json() as Promise<TData>;
        }

        if (contentType.includes('text')) {
          return response.text() as Promise<TData>;
        }
        // default to json
        return response.json() as Promise<TData>;
      }
      return of<ErrorResponse>({ error: true, message: `Error ${response.status}` });
    }),
    catchError(err => {
      console.error(err);
      return of<ErrorResponse>({ error: true, message: err.message as string });
    })
  );
}
