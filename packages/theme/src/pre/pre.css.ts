import { globalStyle } from '@vanilla-extract/css';
import { lightMode, darkMode } from '../color/lightMode';
import { vars } from '../vars.css';

globalStyle('pre > code', {
  display: 'grid',
  padding: vars.space.horizontal.x2,
  marginTop: vars.space.vertical.x6
});

/** pre elements */
globalStyle(`${lightMode} pre[data-theme="light"]`, {
  backgroundColor: vars.color.light.neutral.background.emphasis
});

globalStyle(`${darkMode} pre[data-theme="dark"]`, {
  backgroundColor: vars.color.dark.neutral.background.emphasis
});

globalStyle(`${lightMode} pre[data-theme="dark"]`, {
  display: 'none'
});

globalStyle(`${darkMode} pre[data-theme="light"]`, {
  display: 'none'
});

/** code elements */
globalStyle(`${lightMode} code[data-theme="dark"]`, {
  display: 'none'
});

globalStyle(`${darkMode} code[data-theme="light"]`, {
  display: 'none'
});

globalStyle(`${lightMode} code[data-theme="light"]`, {
  backgroundColor: vars.color.light.neutral.background.emphasis
});

globalStyle(`${darkMode} code[data-theme="dark"]`, {
  backgroundColor: vars.color.dark.neutral.background.emphasis
});
