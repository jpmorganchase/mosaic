import { StyleRule } from '@vanilla-extract/css';
import fastDeepEqual from 'fast-deep-equal';

import { breakpoint } from './breakpoint';

const makeMediaQuery = (breakpointName: keyof typeof breakpoint) => (styles?: StyleRule) => {
  if (!styles || Object.keys(styles).length === 0) {
    return {};
  }
  return {
    [`screen and (min-width: ${breakpoint[breakpointName]}px)`]: styles
  };
};

const mediaQuery = {
  tablet: makeMediaQuery('tablet'),
  web: makeMediaQuery('web'),
  desktop: makeMediaQuery('desktop')
};

interface ResponsiveStyle {
  mobile?: StyleRule;
  tablet?: StyleRule;
  web?: StyleRule;
  desktop?: StyleRule;
}

const getResponsiveStyle = (targetStyles: StyleRule | null, smallerTargetStyles: StyleRule) =>
  !targetStyles || fastDeepEqual(targetStyles, smallerTargetStyles) ? null : smallerTargetStyles;

export const responsiveStyle = ({
  mobile = {},
  tablet = {},
  web = {},
  desktop = {}
}: ResponsiveStyle): StyleRule => {
  // TODO: Re-enable this code to optimize the CSS, once we understand why we cannot import fastDeepEqual during build

  const { '@media': _omitted, ...mobileStyles } = mobile;

  const tabletStyles = getResponsiveStyle(tablet, mobileStyles);

  const stylesBelowWeb = tabletStyles || mobileStyles;
  const webStyles = getResponsiveStyle(web, stylesBelowWeb);

  const stylesBelowDesktop = webStyles || tabletStyles || mobileStyles;
  const desktopStyles = getResponsiveStyle(webStyles, stylesBelowDesktop);

  const hasMediaQueries = tabletStyles || webStyles || desktopStyles;

  return {
    ...mobile,
    ...(hasMediaQueries
      ? {
          '@media': {
            ...(tablet ? mediaQuery.tablet(tablet) : {}),
            ...(web ? mediaQuery.web(web) : {}),
            ...(desktop ? mediaQuery.desktop(desktop) : {})
          }
        }
      : {})
  };
};
