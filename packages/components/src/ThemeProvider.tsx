import React from 'react';
import { SaltProvider } from '@salt-ds/core';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

import { useColorMode, ColorModeProvider } from './ColorModeProvider';

function ColorModeThemeProvider({ theme: themeOverrides = {}, children }) {
  const colorMode = useColorMode();
  return (
    <SaltProvider applyClassesTo="child" mode={colorMode}>
      <div className={themeClassName}>{children}</div>
    </SaltProvider>
  );
}

export function ThemeProvider({ theme: themeOverrides = {}, children }) {
  return (
    <ColorModeProvider>
      <ColorModeThemeProvider theme={themeOverrides}>{children}</ColorModeThemeProvider>
    </ColorModeProvider>
  );
}
