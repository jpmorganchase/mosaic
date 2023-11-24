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

export type Source<TOptions = Record<string, unknown>, TPage extends Page = Page> = {
  create(options: TOptions, helpers: SourceConfig): Observable<TPage[]>;
};
