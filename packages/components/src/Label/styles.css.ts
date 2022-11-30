import { style } from '@vanilla-extract/css';
import { paragraph } from '@jpmorganchase/mosaic-theme';
import { backgroundColor } from '@jpmorganchase/mosaic-theme/dist';

export default {
  tooltip: style([
    {
      display: 'block'
    },
    backgroundColor({ variant: 'regular' })
  ]),
  tooltipTitle: style([paragraph({ variant: 'paragraph5' }), { display: 'block' }]),
  tooltipContent: style([paragraph({ variant: 'paragraph6' }), { display: 'block' }])
};
