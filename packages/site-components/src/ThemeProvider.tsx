import { ReactNode } from 'react';
import { SaltProvider } from '@salt-ds/core';
import { useColorMode } from '@jpmorganchase/mosaic-store';

import classnames from 'clsx';

interface ThemeProviderProps {
  className?: string;
  children?: ReactNode;
}

export function ThemeProvider({ className, children }: ThemeProviderProps) {
  const { colorMode } = useColorMode();

  return (
    <SaltProvider mode={colorMode} enableStyleInjection={false}>
      <div className={classnames('salt-theme', 'salt-density-medium', className)}>
        {children}
        <div data-mosaic-id="portal-root" />
      </div>
    </SaltProvider>
  );
}
