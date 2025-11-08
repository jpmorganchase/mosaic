import type { Observable } from 'rxjs';

import type { Serialiser } from './Serialiser.js';
import type { Page } from './Page.js';
import { SourceSchedule } from './index.js';

/**
 * Provided by Mosaic to a Source
 */
export type SourceConfig = {
  /**
   * The allowed page extensions Mosaic has been configured to use
   */
  pageExtensions: string[];
  /**
   * The page serialiser compatible with the pageExtensions
   */
  serialiser: Serialiser;
  /**
   * Scheduling configuration for the source
   */
  schedule: SourceSchedule;
};

export interface SourceHttpError {
  type: 'error';
  kind: 'http';
  message: string;
  index: number;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface SourceThrownError {
  type: 'error';
  kind: 'thrown';
  message: string;
  index: number;
  url: string;
}

export type SourceError = SourceHttpError | SourceThrownError;

export type SourceResult<TPage> = {
  type: 'success';
  index: number;
  data: TPage;
  url: string;
};

export type SourceResultSummary<TPage> = {
  results: SourceResult<TPage>[];
  errors: SourceError[];
};

export type Source<TOptions = Record<string, unknown>, TPage extends Page = Page> = {
  create(options: TOptions, helpers: SourceConfig): Observable<TPage[]>;
};
