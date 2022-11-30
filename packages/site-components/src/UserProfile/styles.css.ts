import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    maxHeight: '100%',
    whiteSpace: 'nowrap',
    alignItems: 'center',
    maxWidth: '240px'
  }),
  firstName: style([
    {
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    },
    responsiveSprinkles({ marginRight: ['x1', 'x1', 'x1', 'x1'] })
  ]),
  avatar: style([responsiveSprinkles({ marginRight: ['x4', 'x4', 'x4', 'x4'] })])
};
