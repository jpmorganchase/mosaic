import { style } from '@vanilla-extract/css';
import { action, responsiveSprinkles, link } from '@jpmorganchase/mosaic-theme';

const styles = {
  root: style([
    {
      display: 'flex',
      flexDirection: 'column'
    },
    action({ variant: 'action1' }),
    responsiveSprinkles({
      rowGap: ['x2', 'x2', 'x2', 'x2'],
      columnGap: ['x2', 'x2', 'x2', 'x2'],
      marginTop: ['x6', 'x6', 'x6', 'x6'],
      marginLeft: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  iconRoot: style({
    display: 'flex'
  }),
  link: style([
    link({ variant: 'regular' }),
    style({
      display: 'flex',
      whiteSpace: 'nowrap'
    })
  ]),
  endAdornment: responsiveSprinkles({ marginLeft: ['x2', 'x2', 'x2', 'x2'] }),
  startAdornment: responsiveSprinkles({ marginRight: ['x2', 'x2', 'x2', 'x2'] })
};

export default styles;
