import { useStore } from './store';

import { ColorMode } from './types/colorMode';

export function useColorMode(): ColorMode {
  const colorMode = useStore.getState().colorMode;
  return colorMode;
}
