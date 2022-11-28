const defaultButtonVars = {
  borderRadius: '0px',
  mobile: {
    height: '44px'
  },
  tablet: {
    height: '44px'
  },
  web: {
    height: '28px'
  },
  desktop: {
    height: '28px'
  }
};

type ButtonVars = typeof defaultButtonVars;

export const buttonVars: ButtonVars = defaultButtonVars;
