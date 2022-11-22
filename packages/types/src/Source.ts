import type { Observable } from 'rxjs';

import type { Serialiser } from './Serialiser.js';
import type { Page } from './Page.js';

export type Source<Options = {}> = {
  create(
    options: Options,
    { serialiser, pageExtensions }: { pageExtensions: string[]; serialiser: Serialiser }
  ): Observable<Page[]>;
};
