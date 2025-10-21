import { style } from '@vanilla-extract/css';
import { action } from '@jpmorganchase/mosaic-theme';

export default {
  menuItems: style([
    {
      display: 'flex',
      height: '44px'
    },
    action({ variant: 'action1' })
  ]),
  flexContainer: style({
    display: 'flex',
    position: 'relative'
  }),
  hideOnFirstRender: style({
    display: 'none'
  })
};
