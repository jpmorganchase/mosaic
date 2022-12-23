import { colorVars as color } from '../salt';

export var RESERVED_HOT_PINK = '#FF69b4';

const dpColors = {
  unknown: RESERVED_HOT_PINK,
  light: {
    actionable: {
      cta: {
        active: color.blue700,
        regular: color.blue600,
        hover: color.blue500,
        disabled: color.blue600
      },
      primary: {
        active: color.grey200,
        regular: color.grey60,
        hover: color.grey40,
        disabled: color.grey60
      },
      secondary: {
        active: color.grey200,
        regular: 'none',
        hover: color.grey40,
        disabled: 'none'
      },
      label: {
        dark: color.grey900,
        darkDisabled: color.grey200,
        light: color.white,
        lighDisabled: color.white
      }
    },
    navigable: {
      link: {
        regular: color.grey900,
        hover: color.blue500,
        disabled: color.grey200
      },
      documentLink: {
        regular: color.blue500,
        hover: color.grey900,
        disabled: color.grey200,
        visited: color.teal300
      },
      headingLink: {
        regular: color.grey900,
        hover: color.grey900,
        disabled: color.grey200,
        visited: color.grey900
      },
      selectableLink: {
        selected: color.orange500,
        selectedLabel: color.grey900,
        hover: color.grey300,
        unselected: color.grey60,
        unselectedLabel: color.grey300
      }
    },
    selectable: {
      inEdit: color.blue500,
      hover: color.blue30,
      hoverLabel: color.grey900,
      selectedLabel: color.white,
      unselectedLabel: color.grey900,
      disabledLabel: color.grey200
    },
    status: {
      info: color.blue500,
      alert: color.orange700,
      negative: color.red500,
      positive: color.green500
    },
    brand: {
      category1: color.blue500,
      category2: color.green500,
      category3: color.teal500,
      category4: color.orange500,
      category5: color.red500,
      category6: color.purple500
    },
    callout: {
      note: color.grey200,
      important: color.blue200,
      tip: color.green200,
      caution: color.orange200,
      warning: color.red200
    },
    neutral: {
      foreground: {
        high: color.grey900,
        mid: color.grey300,
        low: color.grey60
      },
      background: {
        emphasis: color.grey10,
        regular: color.white
      }
    }
  },
  dark: {
    actionable: {
      cta: {
        active: color.blue700,
        regular: color.blue600,
        hover: color.blue500,
        disabled: color.blue600
      },
      primary: {
        active: color.grey80,
        regular: color.grey300,
        hover: color.grey200,
        disabled: color.grey300
      },
      secondary: {
        active: color.grey80,
        regular: 'none',
        hover: color.grey200,
        disabled: 'none'
      },
      label: {
        dark: color.grey200,
        darkDisabled: color.grey900,
        light: color.white,
        lighDisabled: color.white
      }
    },
    navigable: {
      link: {
        regular: color.white,
        hover: color.blue200,
        disabled: color.grey50
      },
      documentLink: {
        regular: color.blue200,
        hover: color.white,
        disabled: color.grey50,
        visited: color.teal100
      },
      headingLink: {
        regular: color.white,
        hover: color.white,
        disabled: color.grey50,
        visited: color.white
      },
      selectableLink: {
        selected: color.orange400,
        selectedLabel: color.white,
        hover: color.grey80,
        unselected: color.grey200,
        unselectedLabel: color.grey70
      }
    },
    selectable: {
      inEdit: color.blue200,
      hover: color.teal800,
      hoverLabel: color.white,
      selectedLabel: color.white,
      unselectedLabel: color.white,
      disabledLabel: color.white
    },
    status: {
      info: color.blue400,
      alert: color.orange500,
      negative: color.red400,
      positive: color.green400
    },
    brand: {
      category1: color.blue400,
      category2: color.green400,
      category3: color.teal400,
      category4: color.orange400,
      category5: color.red400,
      category6: color.purple400
    },
    callout: {
      note: color.grey400,
      important: color.blue400,
      tip: color.green400,
      caution: color.orange400,
      warning: color.red400
    },
    neutral: {
      foreground: {
        high: color.white,
        mid: color.grey70,
        low: color.grey100
      },
      background: {
        emphasis: color.grey500,
        regular: color.grey800
      }
    }
  }
};

type ColorVars = typeof dpColors;

export const colorVars: ColorVars = dpColors;
