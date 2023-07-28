import type { Observable } from 'rxjs';

import type { Serialiser } from './Serialiser.js';
import type { Page } from './Page.js';
import { SourceSchedule } from './index.js';

export type Source<Options = {}> = {
  create(
    options: Options,
    {
      serialiser,
      pageExtensions,
      schedule
    }: { pageExtensions: string[]; serialiser: Serialiser; schedule: SourceSchedule }
  ): Observable<Page[]>;
};
