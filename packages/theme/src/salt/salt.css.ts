import { createGlobalTheme, createGlobalThemeContract, globalStyle } from '@vanilla-extract/css';
import { horizontal } from '../responsive/vars.css';
import { lightMode, darkMode } from '../color/lightMode';
import { fontWeightVars } from '../typography/vars.css';
import { colorVars as mosaicColorVars } from '../color/vars.css';

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
  size: '--saltIcon-size-multiplier'
});

createGlobalTheme('.saltIcon', iconSizeVars, {
  size: '1'
});

export const iconColorVars = createGlobalThemeContract({
  fill: '--saltIcon-color'
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

export const menuButtonTriggerVars = createGlobalThemeContract({
  open: {
    fontWeight: '--saltButton-fontWeight'
  }
});

createGlobalTheme('.saltMenuButtonTrigger', menuButtonTriggerVars, {
  open: {
    fontWeight: fontWeightVars.regular
  }
});

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
// TODO Salt has not used it's own theme and has a hardcoded hex value, so we need a global style
globalStyle(`${lightMode} .saltMenuItem-menuItemHover:hover`, {
  background: mosaicColorVars.light.selectable.hover
});
globalStyle(`${darkMode} .saltMenuItem-menuItemHover:hover`, {
  background: mosaicColorVars.dark.selectable.hover
});

globalStyle(`${darkMode} .saltLogo-logo`, {
  filter: 'invert(0.5)'
});

export const interactPalette = createGlobalThemeContract({
  backgroundColor: '--salt-palette-interact-background',
  backgroundColorBlurSelected: '--salt-palette-interact-background-blurSelected',
  backgroundColorHover: '--salt-palette-interact-background-hover',
  backgroundColorActive: '--salt-palette-interact-background-active',
  backgroundColorDisabled: '--salt-palette-interact-background-disabled'
});

createGlobalTheme(lightMode, interactPalette, {
  backgroundColor: 'transparent',
  backgroundColorBlurSelected: 'transparent',
  backgroundColorHover: mosaicColorVars.light.selectable.hover,
  backgroundColorActive: mosaicColorVars.light.selectable.hover,
  backgroundColorDisabled: 'transparent'
});

createGlobalTheme(darkMode, interactPalette, {
  backgroundColor: 'transparent',
  backgroundColorBlurSelected: 'transparent',
  backgroundColorHover: mosaicColorVars.dark.selectable.hover,
  backgroundColorActive: mosaicColorVars.dark.selectable.hover,
  backgroundColorDisabled: 'transparent'
});
