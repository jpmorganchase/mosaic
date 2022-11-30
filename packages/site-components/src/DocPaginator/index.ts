import { withNextPrevAdapter } from './withNextPrevAdapter';
import { DocPaginator as OriginalDocPaginator } from './DocPaginator';

export { withNextPrevAdapter } from './withNextPrevAdapter';
export const DocPaginator = withNextPrevAdapter(OriginalDocPaginator);
