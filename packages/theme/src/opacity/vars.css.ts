const dpOpacity = {
  light: {
    disabled: '0.4',
    watermark: '0.1'
  },
  dark: {
    disabled: '0.4',
    watermark: '0.1'
  }
};

type OpacityVars = typeof dpOpacity;

export const opacityVars: OpacityVars = dpOpacity;
