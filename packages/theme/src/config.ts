/** Some values we want to make available to the JS code, rather than via CSS vars */
export const config = {
  appHeader: { height: 44 },
  main: { width: 1128, wideWidth: 1440 }
};

export type ThemeConfig = typeof config;
