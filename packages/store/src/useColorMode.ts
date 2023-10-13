import { useStore } from './store';

export const lightMode = 'light';
export const darkMode = 'dark';

export type ColorMode = typeof lightMode | typeof darkMode;

export function useColorMode(): ColorMode {
  const colorMode = useStore(state => state.colorMode);
  return colorMode;
}
