const mobileTabletSize = 26;
const webDesktopSize = 40;
const paddingTop = 0;

const mobileTabletImageTop = paddingTop + mobileTabletSize / 2;
const webDesktopImageTop = paddingTop + webDesktopSize / 2;

const defaultImpactVars = {
  image: {
    mobile: {
      width: `${mobileTabletSize}px`,
      height: `${mobileTabletSize}px`,
      top: `${paddingTop}px`
    },
    tablet: {
      width: `${mobileTabletSize}px`,
      height: `${mobileTabletSize}px`,
      top: `${paddingTop}px`
    },
    web: {
      width: `${webDesktopSize}px`,
      height: `${webDesktopSize}px`,
      top: `${paddingTop}px`
    },
    desktop: {
      width: `${webDesktopSize}px`,
      height: `${webDesktopSize}px`,
      top: `${paddingTop}px`
    }
  },
  line: {
    mobile: { top: `${mobileTabletImageTop}px` },
    tablet: { top: `${mobileTabletImageTop}px` },
    web: { top: `${webDesktopImageTop}px` },
    desktop: { top: `${webDesktopImageTop}px` }
  }
};

type ImpactVars = typeof defaultImpactVars;

export const impactVars: ImpactVars = defaultImpactVars;
