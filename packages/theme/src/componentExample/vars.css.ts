import { colorVars } from '../salt';

const defaultComponentExampleVars = {
  light: {
    innerBackground: colorVars.green10,
    outerBackground: colorVars.orange10
  },
  dark: {
    innerBackground: colorVars.green10,
    outerBackground: colorVars.orange10
  }
};

type ComponentExampleVars = typeof defaultComponentExampleVars;

export const componentExampleVars: ComponentExampleVars = defaultComponentExampleVars;
