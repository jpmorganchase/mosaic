import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

const root = style({
  background: 'inherit',
  display: 'flex',
  justifyContent: 'center',
  flexShrink: 0,
  flexGrow: 0,
  position: 'relative',
  overflow: 'hidden'
});

export default {
  alignLeft: style({
    marginRight: 'auto'
  }),
  alignRight: style({
    selectors: {
      [`${root}&`]: {
        marginLeft: 'auto!important'
      }
    }
  }),
  root
};

globalStyle(`${root} > *:not(:first-child)`, {
  marginLeft: vars.space.horizontal.x1
});
