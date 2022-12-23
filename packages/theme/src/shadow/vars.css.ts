import { shadowVars as shadows } from '../salt';
import { colorVars } from '../color/vars.css';

const unknownShadow = `0 2px 4px rgba(0, 0, 0, 0.10), inset 0px -1px 0px ${colorVars.unknown}`;

const dpShadows = {
  unknown: unknownShadow,
  light: {
    // elevation 1: card, tiles, pagination
    elevation1: shadows.shadow2,
    // elevation 2: app header
    elevation2: shadows.shadow2,
    // elevation 3: dialogs and modals
    elevation3: shadows.shadow3,
    // elevation 4: tooltips
    elevation4: shadows.shadow4
  },
  dark: {
    // elevation 1: card, tiles, pagination
    elevation1: shadows.shadow2,
    // elevation 2: app header
    elevation2: shadows.shadow2,
    // elevation 3: dialogs and modals
    elevation3: shadows.shadow3,
    // elevation 4: tooltips
    elevation4: shadows.shadow4
  }
};

type ShadowVars = typeof dpShadows;

export const shadowVars: ShadowVars = dpShadows;
