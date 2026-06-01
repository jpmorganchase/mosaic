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

/**
 * Static, self-describing flags a Source exposes alongside its
 * `create()` factory. Read once at source-load time and propagated
 * to the browser (via per-route shared config) so consumers like the
 * editor can branch on what a source supports.
 *
 * Defaults are conservative: an absent flag is equivalent to `false`.
 * A source must explicitly opt in to a capability for runtime
 * surfaces to enable it.
 */
export interface SourceCapabilities {
  /**
   * Pages from this source can be edited and new pages created via
   * the editor UI. Implies the source has a corresponding workflow
   * that can persist changes back (typically by raising a PR).
   *
   * Sources whose backing store has no audit/review boundary (raw
   * filesystem, ephemeral fetch) should leave this absent.
   */
  writable?: boolean;
}

export type Source<TOptions = Record<string, unknown>, TPage extends Page = Page> = {
  create(options: TOptions, helpers: SourceConfig): Observable<TPage[]>;
  /**
   * Optional capability declaration. Absent === all defaults
   * (currently: nothing opted in).
   */
  capabilities?: SourceCapabilities;
};
