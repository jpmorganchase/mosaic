import React from 'react';
import { ToolkitProvider } from '@jpmorganchase/uitk-core';
// import { themeClassName } from '@jpmorganchase/mosaic-theme';

import { useColorMode, ColorModeProvider } from './ColorModeProvider';

function ColorModeThemeProvider({ children }) {
  const colorMode = useColorMode();
  return (
    <ToolkitProvider applyClassesTo="child" mode={colorMode}>
      {children}
    </ToolkitProvider>
  );
}

export function ThemeProvider({ children }) {
  return (
    <ColorModeProvider>
      <ColorModeThemeProvider>{children}</ColorModeThemeProvider>
    </ColorModeProvider>
  );
}
