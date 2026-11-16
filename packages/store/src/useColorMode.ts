import { useColorModeContext } from './ColorModeProvider';

import { ColorMode } from './types/colorMode';

export function useColorMode(): ColorMode {
  return useColorModeContext().colorMode;
}
