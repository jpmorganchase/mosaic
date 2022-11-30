import { withTableOfContentsAdapter } from './withTableOfContentsAdapter';
import { TableOfContents as OriginalTableOfContents } from './TableOfContents';

export { withTableOfContentsAdapter } from './withTableOfContentsAdapter';
export const TableOfContents = withTableOfContentsAdapter(OriginalTableOfContents);
