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
      flexDirection: 'column'
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
    margin: vars.space.vertical.x2,
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
      height: '4px',
      opacity: '0.8',
      borderRadius: '10px'
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
