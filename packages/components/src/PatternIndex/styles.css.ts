import { neutralBorder, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';

export default {
  root: style([
    responsiveSprinkles({
      paddingTop: ['x4', 'x4', 'x4', 'x4'],
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    }),
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })
  ]),
  content: style({
    minHeight: '800px',
    paddingTop: '16px',
    paddingBottom: '16px'
  }),
  count: style({
    flexDirection: 'row-reverse',
    display: 'flex'
  }),
  sortFormField: style({
    justifyContent: 'flex-end'
  }),
  filterFormField: style({
    width: '240px',
    paddingBottom: '16px',
    display: 'block'
  })
};
