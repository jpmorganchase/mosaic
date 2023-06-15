import { style } from '@vanilla-extract/css';
import { vars, beforeElementColorSprinkles } from '@jpmorganchase/mosaic-theme';

const beforeElementBackground = beforeElementColorSprinkles({
  backgroundColor: {
    lightMode: vars.color.dark.neutral.foreground.low,
    darkMode: vars.color.light.neutral.foreground.low
  }
});

export default {
  root: style([
    beforeElementBackground,
    style({
      marginLeft: vars.space.horizontal.x2,
      marginRight: vars.space.horizontal.x1,
      selectors: {
        '&:before': {
          content: '""',
          position: 'absolute',
          background: 'inherit',
          top: '10px',
          width: '1px',
          height: vars.space.vertical.x6
        }
      }
    })
  ])
};
