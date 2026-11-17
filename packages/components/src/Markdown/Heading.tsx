import { heading } from '@jpmorganchase/mosaic-theme';

import { withStyledTypography } from '../Typography/withStyledTypography';

export const H0 = withStyledTypography(heading({ variant: 'heading0', context: 'markdown' }), 'h1');
export const H1 = withStyledTypography(heading({ variant: 'heading1', context: 'markdown' }), 'h1');
export const H2 = withStyledTypography(heading({ variant: 'heading2', context: 'markdown' }), 'h2');
export const H3 = withStyledTypography(heading({ variant: 'heading3', context: 'markdown' }), 'h3');
export const H4 = withStyledTypography(heading({ variant: 'heading4', context: 'markdown' }), 'h4');
export const H5 = withStyledTypography(heading({ variant: 'heading5', context: 'markdown' }), 'h5');
export const H6 = withStyledTypography(heading({ variant: 'heading6', context: 'markdown' }), 'h6');
