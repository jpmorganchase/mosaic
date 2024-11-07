import { style } from '@vanilla-extract/css';
import { blockquote, watermark } from '@jpmorganchase/mosaic-theme';

export default {
  root: blockquote({ context: 'markdown' }),
  watermark: style([
    {
      ':after': {
        content: 'close-quote',
        display: 'block',
        height: 0,
        visibility: 'hidden'
      }
    },
    watermark({ variant: 'blockquote' })
  ]),
  content: style({
    selectors: {
      [`blockquote &`]: {
        marginTop: '0'
      }
    }
  })
};
