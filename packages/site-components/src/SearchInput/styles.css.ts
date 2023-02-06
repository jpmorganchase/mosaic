import { style } from '@vanilla-extract/css';
import {
  backgroundColor,
  brandBorder,
  neutralBorder,
  shadow,
  foregroundColor,
  selectableBorder
} from '@jpmorganchase/mosaic-theme';

export const POPPER_Z_INDEX = 10;

export default {
  root: style({
    position: 'relative'
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
  resultsList: style([style({ width: '500px' })]),
  item: style([
    foregroundColor({ variant: 'mid' }),
    style({
      padding: '9px 8px',
      height: '100%',
      cursor: 'pointer',
      boxSizing: 'border-box',
      borderColor: 'transparent'
    })
  ]),
  itemInactive: style([neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })]),
  itemActive: style([
    backgroundColor({ variant: 'emphasis' }),
    selectableBorder({
      variant: 'focusRing',
      borderWidth: 'thin'
    }),
    style({
      boxSizing: 'border-box',
      outline: 'none'
    })
  ]),
  itemContent: style({
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  })
};
