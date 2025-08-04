import { style } from '@vanilla-extract/css';
import {
  backgroundColor,
  responsiveSprinkles,
  responsiveStyle,
  vars
} from '@jpmorganchase/mosaic-theme';

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
      margin: vars.space.vertical.x4
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
      position: 'relative',
      top: '-5px',
      marginLeft: vars.space.horizontal.x2,
      marginRight: vars.space.horizontal.x2
    })
  ]),
  buttonBar: style([
    style({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row'
    }),
    responsiveSprinkles({ gap: ['x1'] })
  ]),
  leftAlign: style({
    justifyContent: 'flex-start'
  })
};
