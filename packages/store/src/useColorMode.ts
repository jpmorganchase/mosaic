import { useStore } from './store';

import { ColorMode } from './types/colorMode';

export function useColorMode(): ColorMode {
  const colorMode = useStore(state => state.colorMode);
  return colorMode;
}
