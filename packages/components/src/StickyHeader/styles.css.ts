import { style } from '@vanilla-extract/css';
import { backgroundColor } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2
    },
    backgroundColor()
  ]),
  sticky: style({
    position: 'sticky'
  })
};
