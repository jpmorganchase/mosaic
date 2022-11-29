import { style } from '@vanilla-extract/css';
import { backgroundColor, responsiveSprinkles, responsiveStyle, vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    responsiveStyle({
      mobile: { width: '400px' },
      tablet: { width: '600px' },
      web: { width: '800px' },
      desktop: { width: '800px' }
    }),
    style({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      margin: 'auto'
    }),
    backgroundColor({ variant: 'emphasis' })
  ]),
  video: style([
    responsiveStyle({
      mobile: { width: '400px' },
      tablet: { width: '600px' },
      web: { width: '800px' },
      desktop: { width: '800px' }
    })
  ]),
  overlay: style([
    responsiveStyle({
      mobile: { width: '400px' },
      tablet: { width: '600px' },
      web: { width: '800px' },
      desktop: { width: '800px' }
    }),
    style({
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      display: 'flex',
      top: '200px'
    })
  ]),
  controlsBar: style({
    display: 'flex',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50px'
  }),
  sliderContainer: style([
    responsiveSprinkles({ margin: ['x2', 'x2', 'x4', 'x4'] }),
    style({
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'row',
      position: 'relative',
      ':hover': {
        cursor: 'pointer'
      }
    })
  ]),
  slider: style([
    responsiveStyle({
      mobile: { width: '50px' },
      tablet: { width: '200px' },
      web: { width: '350px' },
      desktop: { width: '350px' }
    }),
    style({
      height: '4px',
      opacity: '0.9',
      borderRadius: '10px'
    })
  ]),
  button: style({
    height: '32px',
    width: '32px',
    color: 'inherit',
    fill: 'currentColor'
  })
};
