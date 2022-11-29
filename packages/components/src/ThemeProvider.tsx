import React from 'react';
import { ToolkitProvider } from '@jpmorganchase/uitk-core';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

import { useColorMode, ColorModeProvider } from './ColorModeToggle';

function ColorModeThemeProvider({ theme: themeOverrides = {}, children }) {
  const colorMode = useColorMode();
  return (
    <ToolkitProvider applyClassesTo="child" mode={colorMode}>
      <div className={themeClassName}>{children}</div>
    </ToolkitProvider>
  );
}

export function ThemeProvider({ theme: themeOverrides = {}, children }) {
  return (
    <ColorModeProvider>
      <ColorModeThemeProvider theme={themeOverrides}>{children}</ColorModeThemeProvider>
    </ColorModeProvider>
  );
}
