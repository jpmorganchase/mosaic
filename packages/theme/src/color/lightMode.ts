export const lightMode = '[data-mode="light"]';
export const darkMode = '[data-mode="dark"]';

export const lightModeConditions = {
  lightMode: { selector: `${lightMode} &` },
  darkMode: { selector: `${darkMode} &` }
};
