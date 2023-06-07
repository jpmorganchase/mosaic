import { style } from '@vanilla-extract/css';
import { backgroundColor, foregroundColor, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

const root = style({
  position: 'relative'
});

export default {
  button: style({
    top: '0px',
    right: '0px',
    selectors: {
      [`${root} &`]: {
        position: 'absolute'
      }
    }
  }),
  filename: style([
    backgroundColor({ variant: 'emphasis' }),
    foregroundColor({ variant: 'low' }),
    responsiveSprinkles({
      paddingLeft: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  pre: style({
    selectors: {
      [`${root} &`]: {
        fontSize: '85%',
        margin: 0,
        whiteSpace: 'pre-wrap'
      }
    }
  }),
  root
};
