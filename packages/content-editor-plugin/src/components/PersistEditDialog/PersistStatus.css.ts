import { style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

export default {
  step: style({
    padding: vars.space.vertical.x2,
    opacity: vars.opacity.light.disabled
  }),
  stepActive: style({
    fontSize: vars.fontSize.s80,
    fontStyle: vars.fontWeight.semibold,
    opacity: 1
  }),
  stepComplete: style({
    opacity: 1
  }),
  stepText: style({
    marginLeft: vars.space.horizontal.x2,
    marginRight: vars.space.horizontal.x2
  })
};
