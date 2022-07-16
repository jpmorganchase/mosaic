import type { Observable } from 'rxjs';

import type Serialiser from './Serialiser';
import type Page from './Page';

type Source<Options = {}> = { create(options: Options, { serialiser }: { serialiser: Serialiser }): Observable<Page[]> };

export default Source;
