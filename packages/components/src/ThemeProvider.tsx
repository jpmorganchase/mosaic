import React, { ReactNode } from 'react';
import { ToolkitProvider } from '@jpmorganchase/uitk-core';

import { useColorMode, ColorModeProvider } from './ColorModeProvider';

function ColorModeThemeProvider({ children }: { children?: ReactNode }) {
  const colorMode = useColorMode();
  return (
    <ToolkitProvider applyClassesTo="child" mode={colorMode}>
      <div>{children}</div>
    </ToolkitProvider>
  );
}

export function ThemeProvider({ children }: { children?: ReactNode }) {
  return (
    <ColorModeProvider>
      <ColorModeThemeProvider>{children}</ColorModeThemeProvider>
    </ColorModeProvider>
  );
}
