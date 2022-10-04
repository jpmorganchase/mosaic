import 'event-target-polyfill';
import 'yet-another-abortcontroller-polyfill';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { fromFetch } from './fromFetch';
import { Response } from 'node-fetch';

export type ErrorResponse = { error: Boolean; message: string };

export function isErrorResponse<TData>(response: TData | ErrorResponse): response is ErrorResponse {
  return (response as ErrorResponse).error !== undefined;
}

export function fromHttpRequest<TData>(url: string): Observable<TData | ErrorResponse> {
  return fromFetch(url).pipe(
    switchMap((response: Response) => {
      if (response.ok) {
        return response.json() as Promise<TData>;
      } else {
        return of<ErrorResponse>({ error: true, message: `Error ${response.status}` });
      }
    }),
    catchError(err => {
      console.error(err);
      return of<ErrorResponse>({ error: true, message: err.message as string });
    })
  );
}
