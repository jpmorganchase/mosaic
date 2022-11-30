import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  section: responsiveSprinkles({
    marginTop: ['x30', 'x30', 'x30', 'x30']
  }),
  main: responsiveSprinkles({
    marginBottom: ['x30', 'x30', 'x30', 'x30']
  }),
  backgroundImage: style([
    responsiveSprinkles({
      display: ['none', 'none', 'inherit', 'inherit']
    }),
    {
      zIndex: -1,
      pointerEvents: 'none',
      userSelect: 'none',
      position: 'absolute'
    }
  ]),
  backgroundImage1: style({
    opacity: '0.25',
    top: '702px',
    left: '1251px',
    width: '254px',
    height: '193px'
  }),
  backgroundImage2: style({
    opacity: '0.5',
    top: '772px',
    left: '1121px',
    width: '385px',
    height: '214px'
  }),
  backgroundImage3: style({
    opacity: '0.15',
    top: '1259px',
    left: '1153px',
    width: '629px',
    height: '1024px'
  }),
  backgroundImage4: style({
    opacity: '0.15',
    top: '2367px',
    left: '1041px',
    width: '750px',
    height: '813px'
  }),
  backgroundImage5: style({
    opacity: '0.5',
    top: '5100px',
    left: '-51px',
    width: '385px',
    height: '214px'
  })
};
