export const lightMode = '[data-mode="light"]';
export const darkMode = '[data-mode="dark"]';

export const lightModeCondition = {
  lightMode: { selector: `${lightMode} &` }
};
export const lightModeInteractiveCondition = {
  ...lightModeCondition,
  lightModeHover: { selector: `${lightMode} &:hover, ${lightMode} &[data-dp-hover="true"]` },
  lightModeActive: { selector: `${lightMode} &:active` },
  lightModeDisabled: { selector: `${lightMode} &:disabled` }
};
export const darkModeCondition = {
  darkMode: { selector: `${darkMode} &` }
};
export const darkModeInteractiveCondition = {
  ...darkModeCondition,
  darkModeHover: { selector: `${darkMode} &:hover` },
  darkModeActive: { selector: `${darkMode} &:active` },
  darkModeDisabled: { selector: `${darkMode} &:disabled` }
};

/**
 * Both modes conditions, use with caution.
 * All properties will be generated against both modes, if you use with `defineProperties`.
 * */
export const bothModeConditions = {
  ...lightModeCondition,
  ...darkModeCondition
};
