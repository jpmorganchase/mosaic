import { link } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';

export default {
  link: style({
    display: 'block'
  }),
  inline: style({
    display: 'inline-block'
  }),
  document: link({ variant: 'document' }),
  heading: link({ variant: 'heading' }),
  regular: link({ variant: 'regular' }),
  selectable: link({ variant: 'selectable' })
};
