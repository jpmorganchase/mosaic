const row = {
  desktopSmall: 'max-content',
  desktopMedium: 'max-content',
  desktopLarge: 'max-content',
  webSmall: 'max-content',
  webMedium: 'max-content',
  webLarge: 'max-content',
  tabletSmall: 'max-content',
  tabletMedium: 'max-content',
  tabletLarge: 'max-content',
  mobileSmall: 'max-content',
  mobileMedium: 'max-content',
  mobileLarge: 'max-content'
};

const column = {
  desktopSmall: 'repeat(4, minmax(0, 1fr))',
  desktopMedium: 'repeat(3, minmax(0, 1fr))',
  desktopLarge: 'repeat(2, minmax(0, 1fr))',
  webSmall: 'repeat(3, minmax(0, 1fr))',
  webMedium: 'repeat(2, minmax(0, 1fr))',
  webLarge: 'repeat(2, minmax(0, 1fr))',
  tabletSmall: 'repeat(2, minmax(0, 1fr))',
  tabletMedium: 'repeat(2, minmax(0, 1fr))',
  tabletLarge: 'repeat(2, minmax(0, 1fr))',
  mobileSmall: 'repeat(1, minmax(0, 1fr))',
  mobileMedium: 'repeat(1, minmax(0, 1fr))',
  mobileLarge: 'repeat(1, minmax(0, 1fr))'
};

const gap = {
  desktop: 'x2',
  web: 'x2',
  mobile: 'x2',
  tablet: 'x2'
};

const dpGrid = {
  row,
  column,
  gap
};

type GridVars = typeof dpGrid;

export const gridVars: GridVars = dpGrid;
