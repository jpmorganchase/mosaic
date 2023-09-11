import { globalStyle, style } from '@vanilla-extract/css';
import { responsiveSprinkles, vars, lightMode, darkMode } from '@jpmorganchase/mosaic-theme';

const root = style([
  {
    display: 'flex',
    justifyContent: 'center',
    flexGrow: 1
  },
  responsiveSprinkles({
    marginTop: ['x1', 'x1', 'x1', 'x1']
  })
]);

const paginator = style({});

export default {
  root,
  paginator
};

/** Light Mode */
globalStyle(`${lightMode} ${paginator} > .saltPagination-pageButtonSelected`, {
  backgroundColor: vars.color.light.actionable.cta.regular,
  color: vars.color.light.actionable.label.light
});

globalStyle(`${lightMode} ${paginator} > .saltPagination-pageButtonSelected:hover`, {
  backgroundColor: vars.color.light.actionable.primary.hover
});

/** Dark Mode */
globalStyle(`${darkMode} ${paginator} > .saltPagination-pageButtonSelected`, {
  backgroundColor: vars.color.dark.actionable.cta.regular,
  color: vars.color.dark.actionable.label.light
});

globalStyle(`${darkMode} ${paginator} > .saltPagination-pageButtonSelected:hover`, {
  backgroundColor: vars.color.dark.actionable.cta.hover
});
