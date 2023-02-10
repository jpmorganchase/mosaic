import { style } from '@vanilla-extract/css';
import { sidebar, action } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      zIndex: 3
    },
    action({ variant: 'action1' })
  ]),
  left: sidebar({ side: 'left' }),
  right: sidebar({ side: 'right' }),
  sticky: style({
    position: 'sticky'
  })
};
