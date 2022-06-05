import type { Observable } from 'rxjs';

import type Parser from './Parser';
import type Page from './Page';

type Source = { create(options: {}, { parser }: { parser: Parser }): Observable<Page[]> };

export default Source;
