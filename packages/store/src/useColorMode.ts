import { useStore } from './useStore';

export const lightMode = 'light';
export const darkMode = 'dark';

export type ColorMode = typeof lightMode | typeof darkMode;
export type SetColorMode = (colorMode: ColorMode) => void;

export function useColorMode(): { colorMode: ColorMode; setColorMode: SetColorMode } {
  const result = useStore(state => ({
    colorMode: state.colorMode,
    setColorMode: state.actions.setColorMode
  }));
  return result;
}
