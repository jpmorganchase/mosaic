import React, { ReactNode } from 'react';
import { SaltProvider } from '@salt-ds/core';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

import { useColorMode, ColorModeProvider } from './ColorModeProvider';

function ColorModeThemeProvider({ children }: { children?: ReactNode }) {
  const colorMode = useColorMode();
  return (
    <SaltProvider applyClassesTo="child" mode={colorMode}>
      <div className={themeClassName}>{children}</div>
    </SaltProvider>
  );
}

export function ThemeProvider({ children }: { children?: ReactNode }) {
  return (
    <ColorModeProvider>
      <ColorModeThemeProvider>{children}</ColorModeThemeProvider>
    </ColorModeProvider>
  );
}
