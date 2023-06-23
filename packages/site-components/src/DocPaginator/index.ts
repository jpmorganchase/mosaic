import { withNavigationAdapter } from './withNavigationAdapter';
import { DocPaginator as OriginalDocPaginator } from './DocPaginator';

export { withNavigationAdapter } from './withNavigationAdapter';
export const DocPaginator = withNavigationAdapter(OriginalDocPaginator);
