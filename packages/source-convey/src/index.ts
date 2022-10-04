import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { fromHttpRequest, isErrorResponse } from '@pull-docs/from-http-request';
import type Source from '@pull-docs/types/dist/Source';
import type Page from '@pull-docs/types/dist/Page';

import { createPages } from './createPages';

export type ConveySection = {
  section: string;
  body: string;
  subheading: string;
};

export type ConveyPage = {
  uniqueEmails: [string];
  key: string;
  id: string;
  product: string;
  subject: string;
  originalSubject: string;
  sections: [ConveySection];
  headerTitle: string;
  emails: string;
  userProvidedEmails: string;
  template: string;
  threadId: string;
  ticketId: string;
  incidentResolved: boolean;
  author: string;
  link: string;
  from: string;
  time: string;
  status: string;
  important: string;
  symphonyRooms: [string];
};

const responseToPages = (response: Array<ConveyPage>) => {
  if (response) {
    let lastSyncedChangeTime = new Date(0);
    const pages = createPages('', 'developer/release-notes', lastSyncedChangeTime, response);
    return pages;
  }
  return [];
};

interface ConveySourceOptions {
  /**
   * The URL to request data from
   */
  endpoint: string;
  /**
   * The interval, in minutes, to wait before querying the endpoint again
   * @default 5 mins
   */
  checkIntervalMins?: number;
  /**
   * Delay, in milliseconds, before making the initial request
   * @default 1000 ms
   */
  initialDelayMs?: number;
}

const ConveySource: Source<ConveySourceOptions> = {
  create({ initialDelayMs = 1000, checkIntervalMins = 5, endpoint }): Observable<Page[]> {
    const delayMs = checkIntervalMins * 60000;

    const request$ = fromHttpRequest<Array<ConveyPage>>(endpoint).pipe(
      // Map the HTTP response JSON to a Convey page
      switchMap(async response => {
        if (isErrorResponse<Array<ConveyPage>>(response)) {
          return [];
        }
        const pages = responseToPages(response);
        return pages;
      })
    );

    return timer(initialDelayMs, delayMs).pipe(switchMap(() => request$));
  }
};

export default ConveySource;
