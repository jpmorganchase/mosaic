import { withFooterAdapter } from './withFooterAdapter';
import { BrandFooter as OriginalFooter } from './BrandFooter';

export type { BrandFooterProps } from './BrandFooter';

export const BrandFooter = withFooterAdapter(OriginalFooter);
