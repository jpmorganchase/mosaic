import React, { ReactNode, useEffect, useState } from 'react';
import { SaltProvider } from '@salt-ds/core';
import { useColorMode } from '@jpmorganchase/mosaic-store';

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

interface ThemeProviderProps {
  className?: string;
  children?: ReactNode;
}

export function ThemeProvider({ className, children }: ThemeProviderProps) {
  const hasHydrated = useHasHydrated();
  const colorMode = useColorMode();

  return (
    <SaltProvider applyClassesTo="child" mode={hasHydrated ? colorMode : 'light'}>
      <div className={className}>
        {children}
        <div data-mosaic-id="portal-root" />
      </div>
    </SaltProvider>
  );
}
