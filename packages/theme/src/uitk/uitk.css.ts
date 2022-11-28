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
    padding: '--uitkAccordion-details-padding'
  }
});

createGlobalTheme('.uitkAccordionSection', accordionVars, {
  summary: {
    height: '56px',
    paddingLeft: horizontal.x10
  },
  details: {
    padding: `${horizontal.x3} ${horizontal.x10}`
  }
});

export const iconSizeVars = createGlobalThemeContract({
  size: 'uitkIcon-size-multiplier'
});

createGlobalTheme('.uitkIcon', iconSizeVars, {
  size: '1'
});

export const iconColorVars = createGlobalThemeContract({
  fill: 'uitkIcon-color'
});

createGlobalTheme('.uitkIcon', iconColorVars, {
  fill: 'currentColor'
});

const densities = [
  '.uitk-density-high',
  '.uitk-density-medium',
  '.uitk-density-low',
  '.uitk-density-touch'
];

densities.forEach(density => {
  createGlobalTheme(`.uitkAccordionSection ${density}`, accordionVars, {
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
  height: '--uitkSwitch-height'
});

createGlobalTheme('.uitkSwitch', switchVars, {
  // Odyssey increased the size of the switch by 2px
  height: '16px'
});

export const buttonVars = createGlobalThemeContract({
  regular: {
    fontWeight: '--uitkButton-fontWeight'
  }
});

createGlobalTheme('.uitkButton-regular', buttonVars, {
  regular: {
    fontWeight: fontWeightVars.regular
  }
});

export const menuButtonTriggerVars = createGlobalThemeContract({
  open: {
    color: '--uitkMenuButton-trigger-open-color'
  }
});

createGlobalTheme('.uitkMenuButtonTrigger', menuButtonTriggerVars, {
  open: {
    color: 'currentColor'
  }
});

export const colorVars = createGlobalThemeContract({
  white: '--uitk-color-white',
  black: '--uitk-color-black',
  red10: '--uitk-color-red-10',
  red20: '--uitk-color-red-20',
  red30: '--uitk-color-red-30',
  red40: '--uitk-color-red-40',
  red50: '--uitk-color-red-50',
  red100: '--uitk-color-red-100',
  red200: '--uitk-color-red-200',
  red300: '--uitk-color-red-300',
  red400: '--uitk-color-red-400',
  red500: '--uitk-color-red-500',
  red600: '--uitk-color-red-600',
  red700: '--uitk-color-red-700',
  red800: '--uitk-color-red-800',
  red900: '--uitk-color-red-900',
  orange10: '--uitk-color-orange-10',
  orange20: '--uitk-color-orange-20',
  orange30: '--uitk-color-orange-30',
  orange40: '--uitk-color-orange-40',
  orange50: '--uitk-color-orange-50',
  orange100: '--uitk-color-orange-100',
  orange200: '--uitk-color-orange-200',
  orange300: '--uitk-color-orange-300',
  orange400: '--uitk-color-orange-400',
  orange500: '--uitk-color-orange-500',
  orange600: '--uitk-color-orange-600',
  orange700: '--uitk-color-orange-700',
  orange800: '--uitk-color-orange-800',
  orange900: '--uitk-color-orange-900',
  green10: '--uitk-color-green-10',
  green20: '--uitk-color-green-20',
  green30: '--uitk-color-green-30',
  green40: '--uitk-color-green-40',
  green50: '--uitk-color-green-50',
  green100: '--uitk-color-green-100',
  green200: '--uitk-color-green-200',
  green300: '--uitk-color-green-300',
  green400: '--uitk-color-green-400',
  green500: '--uitk-color-green-500',
  green600: '--uitk-color-green-600',
  green700: '--uitk-color-green-700',
  green800: '--uitk-color-green-800',
  green900: '--uitk-color-green-900',
  teal10: '--uitk-color-teal-10',
  teal20: '--uitk-color-teal-20',
  teal30: '--uitk-color-teal-30',
  teal40: '--uitk-color-teal-40',
  teal50: '--uitk-color-teal-50',
  teal100: '--uitk-color-teal-100',
  teal200: '--uitk-color-teal-200',
  teal300: '--uitk-color-teal-300',
  teal400: '--uitk-color-teal-400',
  teal500: '--uitk-color-teal-500',
  teal600: '--uitk-color-teal-600',
  teal700: '--uitk-color-teal-700',
  teal800: '--uitk-color-teal-800',
  teal900: '--uitk-color-teal-900',
  blue10: '--uitk-color-blue-10',
  blue20: '--uitk-color-blue-20',
  blue30: '--uitk-color-blue-30',
  blue40: '--uitk-color-blue-40',
  blue50: '--uitk-color-blue-50',
  blue100: '--uitk-color-blue-100',
  blue200: '--uitk-color-blue-200',
  blue300: '--uitk-color-blue-300',
  blue400: '--uitk-color-blue-400',
  blue500: '--uitk-color-blue-500',
  blue600: '--uitk-color-blue-600',
  blue700: '--uitk-color-blue-700',
  blue800: '--uitk-color-blue-800',
  blue900: '--uitk-color-blue-900',
  purple10: '--uitk-color-purple-10',
  purple20: '--uitk-color-purple-20',
  purple30: '--uitk-color-purple-30',
  purple40: '--uitk-color-purple-40',
  purple50: '--uitk-color-purple-50',
  purple100: '--uitk-color-purple-100',
  purple200: '--uitk-color-purple-200',
  purple300: '--uitk-color-purple-300',
  purple400: '--uitk-color-purple-400',
  purple500: '--uitk-color-purple-500',
  purple600: '--uitk-color-purple-600',
  purple700: '--uitk-color-purple-700',
  purple800: '--uitk-color-purple-800',
  purple900: '--uitk-color-purple-900',
  grey10: '--uitk-color-grey-10',
  grey20: '--uitk-color-grey-20',
  grey30: '--uitk-color-grey-30',
  grey40: '--uitk-color-grey-40',
  grey50: '--uitk-color-grey-50',
  grey60: '--uitk-color-grey-60',
  grey70: '--uitk-color-grey-70',
  grey80: '--uitk-color-grey-80',
  grey90: '--uitk-color-grey-90',
  grey100: '--uitk-color-grey-100',
  grey200: '--uitk-color-grey-200',
  grey300: '--uitk-color-grey-300',
  grey400: '--uitk-color-grey-400',
  grey500: '--uitk-color-grey-500',
  grey600: '--uitk-color-grey-600',
  grey700: '--uitk-color-grey-700',
  grey800: '--uitk-color-grey-800',
  grey900: '--uitk-color-grey-900'
});

createGlobalTheme(`${lightMode},${darkMode}`, colorVars);

export const shadowVars = createGlobalThemeContract({
  shadow0: '--uitk-shadow-0',
  shadow1: '--uitk-shadow-1',
  shadow2: '--uitk-shadow-2',
  shadow3: '--uitk-shadow-3',
  shadow4: '--uitk-shadow-4',
  shadow5: '--uitk-shadow-5'
});

createGlobalTheme(`${lightMode},${darkMode}`, shadowVars);

export const typographyVars = createGlobalThemeContract({
  fontFamily: '--uitk-typography-fontFamily'
});

createGlobalTheme(
  `.uitk-density-touch.uitk-density-touch,.uitk-density-low.uitk-density-low,.uitk-density-medium.uitk-density-medium,.uitk-density-high.uitk-density-high`,
  typographyVars,
  {
    fontFamily: 'Open Sans'
  }
);

// TODO Odyssey toolbars wrap every child in a Formfield, creating multiple focus rings
// Toolbar focus is buggy, this improves things until UITK provide a fix
// Remove this once UITK Odyssey Toolbar issues are resolved
globalStyle('.uitkToolbar > .Responsive-inner > .uitkFormField.uitkToolbarField::before', {
  outline: 'none !important'
});

globalStyle('.uitkMenuButtonTrigger > .uitkButton-label', {
  paddingLeft: horizontal.x2,
  paddingRight: horizontal.x2,
  fontWeight: fontWeightVars.regular
});

// TODO remove once UITK Odyssey adds Z Index support to CascadingMenu
globalStyle('.uitkCascadingMenuList-popper', {
  zIndex: '1'
});
