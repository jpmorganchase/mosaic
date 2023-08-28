import { responsiveSprinkles, vars, config } from '@jpmorganchase/mosaic-theme';
import { globalStyle, style } from '@vanilla-extract/css';

const base = style({});

globalStyle(`${base} > main`, {
  height: `calc(100% + ${config.appHeader.height}px)`
});

export default {
  root: style([
    style({
      maxWidth: '100vw',
      marginLeft: vars.space.horizontal.x10,
      marginRight: vars.space.horizontal.x10
    }),
    responsiveSprinkles({
      marginTop: ['x6', 'x6', 'x10', 'x10']
    })
  ]),
  base
};
