import { style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    marginLeft: vars.space.horizontal.x2,
    marginRight: vars.space.horizontal.x1,
    selectors: {
      '&:before': {
        content: '""',
        position: 'absolute',
        background: vars.color.dark.neutral.foreground.low,
        top: '10px',
        width: '1px',
        height: vars.space.vertical.x6
      }
    }
  })
};
