import {
  action,
  amount,
  caption,
  eyebrow,
  paragraph,
  subtitle,
  watermark
} from '@jpmorganchase/mosaic-theme';
import { withStyledTypography } from '@jpmorganchase/mosaic-components';
import * as markdownElements from './markdownElements';

export const Action1 = withStyledTypography(action({ variant: 'action1', context: 'markdown' }));
export const Action2 = withStyledTypography(action({ variant: 'action2', context: 'markdown' }));
export const Action3 = withStyledTypography(action({ variant: 'action3', context: 'markdown' }));
export const Action4 = withStyledTypography(action({ variant: 'action4', context: 'markdown' }));
export const Action5 = withStyledTypography(action({ variant: 'action5', context: 'markdown' }));
export const Action6 = withStyledTypography(action({ variant: 'action6', context: 'markdown' }));
export const Action7 = withStyledTypography(action({ variant: 'action7', context: 'markdown' }));
export const Action8 = withStyledTypography(action({ variant: 'action8', context: 'markdown' }));
export const Caption1 = withStyledTypography(caption({ variant: 'caption1', context: 'markdown' }));
export const Caption2 = withStyledTypography(caption({ variant: 'caption2', context: 'markdown' }));
export const Caption3 = withStyledTypography(caption({ variant: 'caption3', context: 'markdown' }));
export const Caption4 = withStyledTypography(caption({ variant: 'caption4', context: 'markdown' }));
export const Caption5 = withStyledTypography(caption({ variant: 'caption5', context: 'markdown' }));
export const Caption6 = withStyledTypography(caption({ variant: 'caption6', context: 'markdown' }));
export const Hr = markdownElements.hr;
export * from './Heading';
export const P1 = markdownElements.p;
export const P2 = withStyledTypography(paragraph({ variant: 'paragraph2', context: 'markdown' }));
export const P3 = withStyledTypography(paragraph({ variant: 'paragraph3', context: 'markdown' }));
export const P4 = withStyledTypography(paragraph({ variant: 'paragraph4', context: 'markdown' }));
export const P5 = withStyledTypography(paragraph({ variant: 'paragraph5', context: 'markdown' }));
export const P6 = withStyledTypography(paragraph({ variant: 'paragraph6', context: 'markdown' }));
export const Subtitle1 = withStyledTypography(
  subtitle({ variant: 'subtitle1', context: 'markdown' })
);
export const Subtitle2 = withStyledTypography(
  subtitle({ variant: 'subtitle2', context: 'markdown' })
);
export const Subtitle3 = withStyledTypography(
  subtitle({ variant: 'subtitle3', context: 'markdown' })
);
export const Subtitle4 = withStyledTypography(
  subtitle({ variant: 'subtitle4', context: 'markdown' })
);
export const Subtitle5 = withStyledTypography(
  subtitle({ variant: 'subtitle5', context: 'markdown' })
);
export const Subtitle6 = withStyledTypography(
  subtitle({ variant: 'subtitle6', context: 'markdown' })
);
export const Amount = withStyledTypography(amount({ context: 'markdown' }));
export const Eyebrow = withStyledTypography(eyebrow({ context: 'markdown' }));
export const Watermark = withStyledTypography(watermark({ context: 'markdown' }));
