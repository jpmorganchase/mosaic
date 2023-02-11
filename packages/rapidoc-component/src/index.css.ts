import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

globalStyle('rapi-doc::part(section-navbar)', {
  paddingTop: vars.space.vertical.x8
});
globalStyle('rapi-doc::part(section-main-content)', {
  paddingTop: vars.space.vertical.x8
});

export default {
  root: style({
    width: '100%',
    height: '100vh'
  })
};
