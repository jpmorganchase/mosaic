import { responsiveSprinkles, vars, config } from '@jpmorganchase/mosaic-theme';
import { style, globalStyle } from '@vanilla-extract/css';

const root = style([
  style({
    maxWidth: '100vw',
    marginLeft: vars.space.horizontal.x10,
    marginRight: vars.space.horizontal.x10
  }),
  responsiveSprinkles({
    marginTop: ['x6', 'x6', 'x10', 'x10']
  })
]);

globalStyle(`${root} > footer`, {
  maxWidth: `${config.main.width}px`,
  marginLeft: 'auto',
  marginRight: 'auto'
});

export default {
  root
};
