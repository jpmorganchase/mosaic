import { createElement } from 'react';
import { useColorMode, useRoute, useStoreActions } from '@jpmorganchase/mosaic-store';

export function ExtensionProbe() {
  const { route } = useRoute();
  const colorMode = useColorMode();
  const { setColorMode } = useStoreActions();
  return createElement(
    'button',
    {
      'data-testid': 'extension',
      onClick: () => setColorMode(colorMode === 'light' ? 'dark' : 'light')
    },
    `Extension ${route} ${colorMode}`
  );
}
