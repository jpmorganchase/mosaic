import { globalStyle } from '@vanilla-extract/css';
import { lightMode, darkMode } from '../color/lightMode';
import { vars } from '../vars.css';
import { colorVars as saltVars } from '../salt/color.css';

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

/** highlighted lines and words */

globalStyle(`code > .line > .word`, {
  borderRadius: '.25rem',
  fontWeight: vars.fontWeight.extrabold,
  boxShadow: vars.shadow.light.elevation3
});

globalStyle(`code > .line.highlighted`, {
  boxShadow: vars.shadow.light.elevation1
});

globalStyle(`code[data-theme="light"] > .line.highlighted `, {
  backgroundColor: saltVars.grey40
});

globalStyle(`code[data-theme="light"] > .line > .word `, {
  backgroundColor: saltVars.blue700,
  color: `${saltVars.blue50}!important`
});

globalStyle(`code[data-theme="dark"] > .line.highlighted `, {
  backgroundColor: saltVars.blue700
});

globalStyle(`code[data-theme="dark"] > .line > .word `, {
  backgroundColor: saltVars.blue50,
  color: `${saltVars.blue700}!important`
});
