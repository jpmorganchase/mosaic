import { heading, responsiveSprinkles, watermark } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';

export default {
  content: style([
    {
      display: 'block'
    },
    responsiveSprinkles({ paddingTop: ['x6', 'x6', 'x6', 'x6'] })
  ]),
  step: style([
    {
      display: 'block',
      position: 'absolute'
    },
    watermark()
  ]),
  title: style([
    heading({ variant: 'heading6' }),
    { display: 'block' },
    responsiveSprinkles({ paddingTop: ['x6', 'x6', 'x6', 'x6'] })
  ])
};
