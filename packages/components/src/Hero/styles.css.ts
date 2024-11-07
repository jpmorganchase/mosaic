import { style } from '@vanilla-extract/css';
import {
  hero,
  responsiveSprinkles,
  foregroundColor,
  caption,
  responsiveStyle
} from '@jpmorganchase/mosaic-theme';

export default {
  datestamp: style([
    {
      fontStyle: 'italic'
    },
    caption({ variant: 'caption6' })
  ]),
  datestampLabel: style([
    {
      fontStyle: 'italic'
    },
    caption({ variant: 'caption6' }),
    responsiveSprinkles({ marginRight: ['x1', 'x1', 'x1', 'x1'] })
  ]),
  description: style([
    style({
      whiteSpace: 'normal'
    }),
    responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] }),
    foregroundColor({ variant: 'high' })
  ]),
  eyebrow: style({
    whiteSpace: 'normal'
  }),
  fixedSize: style({
    display: 'flex'
  }),
  fullWidth: style({
    display: 'block'
  }),
  fullWidthImage: responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] }),
  fullWidthTitle: style([
    style({
      whiteSpace: 'normal',
      maxWidth: 'unset'
    }),
    foregroundColor({ variant: 'high' })
  ]),
  frame: style([
    {
      backgroundRepeat: 'no-repeat',
      position: 'relative'
    },
    hero.frame,
    responsiveSprinkles({
      marginLeft: ['none', 'none', 'x6', 'x6'],
      marginTop: ['x6', 'x6', 'none', 'none']
    })
  ]),
  frameImage: style([{ position: 'absolute' }, hero.frameImage]),
  frameBackgroundImage: style([{ position: 'relative' }, hero.frameBackgroundImage]),
  heading: style([
    style({
      whiteSpace: 'normal'
    }),
    responsiveSprinkles({
      marginRight: ['x6', 'x6', 'x6', 'x6']
    }),
    foregroundColor({ variant: 'high' })
  ]),
  image: style([
    style(
      responsiveStyle({
        mobile: { height: '257px' },
        tablet: { height: '333px' },
        web: { height: '414px' },
        desktop: { height: '425px' }
      })
    ),
    responsiveSprinkles({
      marginTop: ['x6', 'x6', 'none', 'none']
    })
  ]),
  imageWidth: style(
    responsiveStyle({
      mobile: { width: '343px' },
      tablet: { width: '444px' },
      web: { width: '552px' },
      desktop: { width: '566px' }
    })
  ),

  lastLink: responsiveSprinkles({ marginRight: ['none', 'none', 'none', 'none'] }),
  link: responsiveSprinkles({ marginRight: ['x6', 'x6', 'x6', 'x6'] }),
  children: style([
    style({
      display: 'flex'
    }),
    responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] })
  ]),
  root: style([
    responsiveSprinkles({
      flexWrap: ['wrap', 'wrap', 'nowrap', 'nowrap']
    }),
    style({
      justifyContent: 'space-between'
    })
  ]),
  title: style({
    whiteSpace: 'normal'
  })
};
