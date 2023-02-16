import { style } from '@vanilla-extract/css';
import { sidebar } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      zIndex: 3
    }
  ]),
  left: sidebar({ side: 'left' }),
  right: sidebar({ side: 'right' }),
  sticky: style({
    position: 'sticky'
  })
};
