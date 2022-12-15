import { style } from '@vanilla-extract/css';
import {
  backgroundColor,
  responsiveStyle,
  responsiveSprinkles,
  vars
} from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    style({
      position: 'relative',
      left: '0px',
      top: '0px',
      display: 'flex',
      flexDirection: 'column',
      margin: vars.space.vertical.x4
    }),
    responsiveSprinkles({ padding: ['x2', 'x2', 'x4', 'x4'] }),
    backgroundColor({ variant: 'emphasis' })
  ]),
  title: style({
    display: 'flex',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  }),
  sliderContainer: style({
    display: 'flex',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ':hover': {
      cursor: 'pointer'
    }
  }),
  slider: style([
    responsiveStyle({
      mobile: { width: '145px' },
      tablet: { width: '350px' },
      web: { width: '280px' },
      desktop: { width: '350px' }
    }),
    style({
      position: 'relative',
      top: -vars.space.vertical.x4,
      margin: vars.space.horizontal.x2
    })
  ]),
  buttonBar: style({
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  }),
  button: style({
    height: '32px',
    width: '32px',
    color: 'inherit',
    fill: 'currentColor'
  })
};
