import { createGlobalTheme, createGlobalThemeContract, globalStyle } from '@vanilla-extract/css';
import { horizontal } from '../responsive/vars.css';
import { lightMode, darkMode } from '../color/lightMode';
import { fontWeightVars } from '../typography/vars.css';

export const accordionVars = createGlobalThemeContract({
  summary: {
    height: '--accordion-summary-height',
    paddingLeft: '--accordion-summary-paddingLeft'
  },
  details: {
    padding: '--saltAccordion-details-padding'
  }
});

createGlobalTheme('.saltAccordionSection', accordionVars, {
  summary: {
    height: '56px',
    paddingLeft: horizontal.x10
  },
  details: {
    padding: `${horizontal.x3} ${horizontal.x10}`
  }
});

export const iconSizeVars = createGlobalThemeContract({
  size: 'saltIcon-size-multiplier'
});

createGlobalTheme('.saltIcon', iconSizeVars, {
  size: '1'
});

export const iconColorVars = createGlobalThemeContract({
  fill: 'saltIcon-color'
});

createGlobalTheme('.saltIcon', iconColorVars, {
  fill: 'currentColor'
});

const densities = [
  '.salt-density-high',
  '.salt-density-medium',
  '.salt-density-low',
  '.salt-density-touch'
];

densities.forEach(density => {
  createGlobalTheme(`.saltAccordionSection ${density}`, accordionVars, {
    summary: {
      height: '56px',
      paddingLeft: horizontal.x10
    },
    details: {
      padding: `${horizontal.x3} ${horizontal.x10}`
    }
  });
});

export const switchVars = createGlobalThemeContract({
  height: '--saltSwitch-height'
});

createGlobalTheme('.saltSwitch', switchVars, {
  // Salt increased the size of the switch by 2px
  height: '16px'
});

export const buttonVars = createGlobalThemeContract({
  regular: {
    fontWeight: '--saltButton-fontWeight'
  }
});

createGlobalTheme('.saltButton-regular', buttonVars, {
  regular: {
    fontWeight: fontWeightVars.regular
  }
});

export const menuButtonTriggerVars = createGlobalThemeContract({
  open: {
    color: '--saltMenuButton-trigger-open-color'
  }
});

createGlobalTheme('.saltMenuButtonTrigger', menuButtonTriggerVars, {
  open: {
    color: 'currentColor'
  }
});

export const colorVars = createGlobalThemeContract({
  white: '--salt-color-white',
  black: '--salt-color-black',
  red10: '--salt-color-red-10',
  red20: '--salt-color-red-20',
  red30: '--salt-color-red-30',
  red40: '--salt-color-red-40',
  red50: '--salt-color-red-50',
  red100: '--salt-color-red-100',
  red200: '--salt-color-red-200',
  red300: '--salt-color-red-300',
  red400: '--salt-color-red-400',
  red500: '--salt-color-red-500',
  red600: '--salt-color-red-600',
  red700: '--salt-color-red-700',
  red800: '--salt-color-red-800',
  red900: '--salt-color-red-900',
  orange10: '--salt-color-orange-10',
  orange20: '--salt-color-orange-20',
  orange30: '--salt-color-orange-30',
  orange40: '--salt-color-orange-40',
  orange50: '--salt-color-orange-50',
  orange100: '--salt-color-orange-100',
  orange200: '--salt-color-orange-200',
  orange300: '--salt-color-orange-300',
  orange400: '--salt-color-orange-400',
  orange500: '--salt-color-orange-500',
  orange600: '--salt-color-orange-600',
  orange700: '--salt-color-orange-700',
  orange800: '--salt-color-orange-800',
  orange900: '--salt-color-orange-900',
  green10: '--salt-color-green-10',
  green20: '--salt-color-green-20',
  green30: '--salt-color-green-30',
  green40: '--salt-color-green-40',
  green50: '--salt-color-green-50',
  green100: '--salt-color-green-100',
  green200: '--salt-color-green-200',
  green300: '--salt-color-green-300',
  green400: '--salt-color-green-400',
  green500: '--salt-color-green-500',
  green600: '--salt-color-green-600',
  green700: '--salt-color-green-700',
  green800: '--salt-color-green-800',
  green900: '--salt-color-green-900',
  teal10: '--salt-color-teal-10',
  teal20: '--salt-color-teal-20',
  teal30: '--salt-color-teal-30',
  teal40: '--salt-color-teal-40',
  teal50: '--salt-color-teal-50',
  teal100: '--salt-color-teal-100',
  teal200: '--salt-color-teal-200',
  teal300: '--salt-color-teal-300',
  teal400: '--salt-color-teal-400',
  teal500: '--salt-color-teal-500',
  teal600: '--salt-color-teal-600',
  teal700: '--salt-color-teal-700',
  teal800: '--salt-color-teal-800',
  teal900: '--salt-color-teal-900',
  blue10: '--salt-color-blue-10',
  blue20: '--salt-color-blue-20',
  blue30: '--salt-color-blue-30',
  blue40: '--salt-color-blue-40',
  blue50: '--salt-color-blue-50',
  blue100: '--salt-color-blue-100',
  blue200: '--salt-color-blue-200',
  blue300: '--salt-color-blue-300',
  blue400: '--salt-color-blue-400',
  blue500: '--salt-color-blue-500',
  blue600: '--salt-color-blue-600',
  blue700: '--salt-color-blue-700',
  blue800: '--salt-color-blue-800',
  blue900: '--salt-color-blue-900',
  purple10: '--salt-color-purple-10',
  purple20: '--salt-color-purple-20',
  purple30: '--salt-color-purple-30',
  purple40: '--salt-color-purple-40',
  purple50: '--salt-color-purple-50',
  purple100: '--salt-color-purple-100',
  purple200: '--salt-color-purple-200',
  purple300: '--salt-color-purple-300',
  purple400: '--salt-color-purple-400',
  purple500: '--salt-color-purple-500',
  purple600: '--salt-color-purple-600',
  purple700: '--salt-color-purple-700',
  purple800: '--salt-color-purple-800',
  purple900: '--salt-color-purple-900',
  grey10: '--salt-color-gray-10',
  grey20: '--salt-color-gray-20',
  grey30: '--salt-color-gray-30',
  grey40: '--salt-color-gray-40',
  grey50: '--salt-color-gray-50',
  grey60: '--salt-color-gray-60',
  grey70: '--salt-color-gray-70',
  grey80: '--salt-color-gray-80',
  grey90: '--salt-color-gray-90',
  grey100: '--salt-color-gray-100',
  grey200: '--salt-color-gray-200',
  grey300: '--salt-color-gray-300',
  grey400: '--salt-color-gray-400',
  grey500: '--salt-color-gray-500',
  grey600: '--salt-color-gray-600',
  grey700: '--salt-color-gray-700',
  grey800: '--salt-color-gray-800',
  grey900: '--salt-color-gray-900'
});

createGlobalTheme(`${lightMode},${darkMode}`, colorVars);

export const shadowVars = createGlobalThemeContract({
  shadow0: '--salt-shadow-0',
  shadow1: '--salt-shadow-1',
  shadow2: '--salt-shadow-2',
  shadow3: '--salt-shadow-3',
  shadow4: '--salt-shadow-4',
  shadow5: '--salt-shadow-5'
});

createGlobalTheme(`${lightMode},${darkMode}`, shadowVars);

// TODO Salt toolbars wrap every child in a Formfield, creating multiple focus rings
// Toolbar focus is buggy, this improves things until Salt provide a fix
// Remove this once Salt Toolbar issues are resolved
globalStyle('.saltToolbar > .Responsive-inner > .saltFormField.saltToolbarField::before', {
  outline: 'none !important'
});

globalStyle('.saltMenuButtonTrigger > .saltButton-label', {
  paddingLeft: horizontal.x2,
  paddingRight: horizontal.x2,
  fontWeight: fontWeightVars.regular
});

// TODO remove once Salt adds Z Index support to CascadingMenu
globalStyle('.saltCascadingMenuList-popper', {
  zIndex: '1'
});
