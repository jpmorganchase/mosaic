import { createVar, style } from '@vanilla-extract/css';
import { darkMode, vars } from '@jpmorganchase/mosaic-theme';

const toggleBrightness = createVar();
const toggleContent = createVar();

export default {
  root: style({
    outline: 'none',
    fontSize: vars.fontSize.s50,
    vars: {
      [toggleBrightness]: '0',
      [toggleContent]: '"☀️"'
    },
    '::before': {
      content: toggleContent,
      filter: `contrast(0) brightness(${toggleBrightness})`
    },
    selectors: {
      [`${darkMode} &`]: {
        vars: {
          [toggleBrightness]: '10',
          [toggleContent]: '"🌙"'
        }
      }
    }
  })
};
