import { style } from '@vanilla-extract/css';
import { link, navigableBorder, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  list: style([
    style({
      listStyle: 'none'
    }),
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      marginBottom: ['x6', 'x6', 'x6', 'x6'],
      padding: ['none', 'none', 'none', 'none']
    })
  ]),
  item: style([
    {
      cursor: 'pointer',
      position: 'relative',
      display: 'block'
    },
    navigableBorder({
      variant: 'unselected',
      borderLeftWidth: 'medium'
    }),
    navigableBorder({
      variant: 'hover',
      borderLeftWidth: 'medium'
    }),
    navigableBorder({
      variant: 'selected',
      borderLeftWidth: 'medium'
    }),
    link({ variant: 'selectable' }),
    responsiveSprinkles({
      paddingTop: ['x1', 'x1', 'x1', 'x1'],
      paddingRight: ['x4', 'x4', 'x4', 'x4'],
      paddingBottom: ['x1', 'x1', 'x1', 'x1']
    })
  ]),
  level1: responsiveSprinkles({
    paddingLeft: ['x2', 'x2', 'x2', 'x2']
  }),
  level2: responsiveSprinkles({
    paddingLeft: ['x4', 'x4', 'x4', 'x4']
  }),
  level3: responsiveSprinkles({
    paddingLeft: ['x6', 'x6', 'x6', 'x6']
  }),
  level4: responsiveSprinkles({
    paddingLeft: ['x8', 'x8', 'x8', 'x8']
  })
};
