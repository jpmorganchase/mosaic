'use client';
import {
  action,
  amount,
  caption,
  emphasis,
  eyebrow,
  heading,
  paragraph,
  subtitle,
  watermark
} from '@jpmorganchase/mosaic-theme';

import { withStyledTypography } from './withStyledTypography';

export const Action1 = withStyledTypography(action({ variant: 'action1' }));
export const Action2 = withStyledTypography(action({ variant: 'action2' }));
export const Action3 = withStyledTypography(action({ variant: 'action3' }));
export const Action4 = withStyledTypography(action({ variant: 'action4' }));
export const Action5 = withStyledTypography(action({ variant: 'action5' }));
export const Action6 = withStyledTypography(action({ variant: 'action6' }));
export const Action7 = withStyledTypography(action({ variant: 'action7' }));
export const Action8 = withStyledTypography(action({ variant: 'action8' }));
export const H0 = withStyledTypography(heading({ variant: 'heading0' }), 'h1');
export const H1 = withStyledTypography(heading({ variant: 'heading1' }), 'h1');
export const H2 = withStyledTypography(heading({ variant: 'heading2' }), 'h2');
export const H3 = withStyledTypography(heading({ variant: 'heading3' }), 'h3');
export const H4 = withStyledTypography(heading({ variant: 'heading4' }), 'h4');
export const H5 = withStyledTypography(heading({ variant: 'heading5' }), 'h5');
export const H6 = withStyledTypography(heading({ variant: 'heading6' }), 'h6');
export const P1 = withStyledTypography(paragraph({ variant: 'paragraph1' }));
export const P2 = withStyledTypography(paragraph({ variant: 'paragraph2' }));
export const P3 = withStyledTypography(paragraph({ variant: 'paragraph3' }));
export const P4 = withStyledTypography(paragraph({ variant: 'paragraph4' }));
export const P5 = withStyledTypography(paragraph({ variant: 'paragraph5' }));
export const P6 = withStyledTypography(paragraph({ variant: 'paragraph6' }));
export const Caption1 = withStyledTypography(caption({ variant: 'caption1' }));
export const Caption2 = withStyledTypography(caption({ variant: 'caption2' }));
export const Caption3 = withStyledTypography(caption({ variant: 'caption3' }));
export const Caption4 = withStyledTypography(caption({ variant: 'caption4' }));
export const Caption5 = withStyledTypography(caption({ variant: 'caption5' }));
export const Caption6 = withStyledTypography(caption({ variant: 'caption6' }));
export const Subtitle1 = withStyledTypography(subtitle({ variant: 'subtitle1' }));
export const Subtitle2 = withStyledTypography(subtitle({ variant: 'subtitle2' }));
export const Subtitle3 = withStyledTypography(subtitle({ variant: 'subtitle3' }));
export const Subtitle4 = withStyledTypography(subtitle({ variant: 'subtitle4' }));
export const Subtitle5 = withStyledTypography(subtitle({ variant: 'subtitle5' }));
export const Subtitle6 = withStyledTypography(subtitle({ variant: 'subtitle6' }));
export const Amount = withStyledTypography(amount());
export const Eyebrow = withStyledTypography(eyebrow());
export const Watermark = withStyledTypography(watermark({ variant: 'regular' }));
export const Emphasis = withStyledTypography(emphasis({ variant: 'regular' }), 'span');
export const Strong = withStyledTypography(emphasis({ variant: 'strong' }), 'span');

export * from './Typography';
