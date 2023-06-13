const defaultButtonVars = {
  borderRadius: '0px',
  mobile: {
    height: '28px'
  },
  tablet: {
    height: '28px'
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
