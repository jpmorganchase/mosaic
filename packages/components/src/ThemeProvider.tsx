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

export function ThemeProvider({ children }: { children?: ReactNode }) {
  const hasHydrated = useHasHydrated();
  const colorMode = useColorMode();

  return (
    <SaltProvider applyClassesTo="child" mode={hasHydrated ? colorMode : 'light'}>
      <div>{children}</div>
    </SaltProvider>
  );
}
