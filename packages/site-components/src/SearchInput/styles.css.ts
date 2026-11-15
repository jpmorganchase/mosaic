import { style } from '@vanilla-extract/css';
import {
  backgroundColor,
  brandBorder,
  neutralBorder,
  shadow,
  foregroundColor,
  responsiveSprinkles,
  vars
} from '@jpmorganchase/mosaic-theme';

export const POPPER_Z_INDEX = 10;

export default {
  root: style([
    style({
      position: 'relative',
      paddingLeft: vars.space.horizontal.x2,
      paddingRight: vars.space.horizontal.x2
    }),
    responsiveSprinkles({
      display: ['none', 'none', 'flex', 'flex']
    })
  ]),
  input: style({
    minWidth: 200
  }),
  popper: style([
    style({
      zIndex: POPPER_Z_INDEX,
      position: 'absolute',
      bottom: '0px',
      right: '0px',
      transform: 'translate3d(0, 100%, 0)'
    }),
    brandBorder({ variant: 'category1', borderWidth: 'thin' }),
    backgroundColor({ variant: 'regular' }),
    shadow({ variant: 'elevation4' })
  ]),
  resultsList: style([style({ width: '500px', maxHeight: '70vh', overflowY: 'auto' })]),
  resultLink: style({
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
    ':hover': { textDecoration: 'underline' },
    ':focus-visible': { outline: '2px solid currentColor' }
  }),
  sectionLink: style({
    display: 'block',
    color: 'inherit',
    paddingTop: vars.space.vertical.x1,
    ':focus-visible': { outline: '2px solid currentColor' }
  }),
  item: style([
    foregroundColor({ variant: 'high' }),
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' }),
    responsiveSprinkles({
      padding: ['x2', 'x2', 'x2', 'x2']
    }),
    style({
      height: '100%',
      boxSizing: 'border-box'
    })
  ]),
  itemContent: style({
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }),
  highlight: style({
    fontWeight: vars.fontWeight.bold
  })
};
