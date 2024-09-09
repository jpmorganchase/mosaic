import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { darkMode, lightMode } from '../color/modes';

import { vars } from '../vars.css';

const borderColorOptions = [
  vars.color.unknown,
  ...Object.values(vars.color.light.brand),
  ...Object.values(vars.color.dark.brand),
  ...Object.values(vars.color.light.callout),
  ...Object.values(vars.color.dark.callout),
  ...Object.values(vars.color.light.neutral.foreground),
  ...Object.values(vars.color.dark.neutral.foreground),
  ...Object.values(vars.color.light.navigable.selectableLink),
  ...Object.values(vars.color.dark.navigable.selectableLink),
  ...Object.values(vars.color.light.selectable),
  ...Object.values(vars.color.dark.selectable),
  ...Object.values(vars.color.light.status),
  ...Object.values(vars.color.dark.status)
];
const borderStyleOptions = ['none', 'dashed', 'dotted', 'solid'];

export const borderProperties = defineProperties({
  conditions: {
    lightMode: { selector: `${lightMode} &` },
    lightModeUnselected: { selector: `${lightMode} &:not([data-selected=true]):not(:hover)` },
    lightModeHover: { selector: `${lightMode} &:not([data-selected=true]):hover` },
    lightModeSelected: { selector: `${lightMode} &[data-selected=true]` },
    darkMode: { selector: `${darkMode} &` },
    darkModeUnselected: { selector: `${darkMode} &:not([data-selected=true]):not(:hover)` },
    darkModeHover: { selector: `${darkMode} &:not([data-selected=true]):hover` },
    darkModeSelected: { selector: `${darkMode} &[data-selected=true]` }
  },
  defaultCondition: [
    'lightMode',
    'lightModeUnselected',
    'lightModeHover',
    'lightModeSelected',
    'darkMode',
    'darkModeUnselected',
    'darkModeHover',
    'darkModeSelected'
  ],
  properties: {
    borderWidth: vars.border.width,
    borderStyle: borderStyleOptions,
    borderColor: borderColorOptions,
    borderTopColor: borderColorOptions,
    borderRightColor: borderColorOptions,
    borderBottomColor: borderColorOptions,
    borderLeftColor: borderColorOptions,
    borderTopWidth: vars.border.width,
    borderRightWidth: vars.border.width,
    borderBottomWidth: vars.border.width,
    borderLeftWidth: vars.border.width
  },
  shorthands: {
    borderColorX: ['borderLeftColor', 'borderRightColor'],
    borderColorY: ['borderTopColor', 'borderBottomColor'],
    borderWidth: ['borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'],
    borderWidthX: ['borderLeftWidth', 'borderRightWidth'],
    borderWidthY: ['borderTopWidth', 'borderBottomWidth']
  }
});

export const borderSprinkles = createSprinkles(borderProperties);
export type BorderSprinkles = Parameters<typeof borderSprinkles>[0];
