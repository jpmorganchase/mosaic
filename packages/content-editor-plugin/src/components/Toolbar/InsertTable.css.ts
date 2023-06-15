import { globalStyle, style } from '@vanilla-extract/css';
import {
  selectableColor,
  table,
  neutralBorder,
  vars,
  backgroundColor,
  foregroundColor
} from '@jpmorganchase/mosaic-theme';

const button = style({ width: vars.space.horizontal.x10 });

export default {
  tableContainer: style({
    position: 'relative',
    margin: vars.space.horizontal.x2
  }),
  table: table({ context: 'component' }),
  addColumnArea: style({
    position: 'absolute',
    top: 0,
    width: '25px'
  }),
  addRowArea: style({
    position: 'absolute',
    left: 0,
    height: '25px'
  }),
  headerRow: selectableColor({ variant: 'inEdit' }),
  row: selectableColor({ variant: 'hover' }),
  cell: style([
    neutralBorder({
      variant: 'high',
      borderWidth: 'thin'
    })
  ]),
  dimensions: style([
    style({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: vars.space.vertical.x2
    }),
    foregroundColor({ variant: 'high' })
  ]),
  popper: style([style({ zIndex: 1600 }), backgroundColor({ variant: 'regular' })]),
  button
};

globalStyle(`${button} > *:not(:first-child)`, {
  marginLeft: vars.space.horizontal.x1
});
