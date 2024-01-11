import { ReactNode, useEffect, useState } from 'react';
import { SaltProvider } from '@salt-ds/core';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import { config } from '@jpmorganchase/mosaic-theme';

import classnames from 'clsx';

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
  const { colorMode } = useColorMode();

  const ssrClassname = hasHydrated ? undefined : config.ssrClassName;

  return (
    <SaltProvider mode={hasHydrated ? colorMode : 'light'}>
      <div className={classnames(ssrClassname, className)}>{children}</div>
      <div data-mosaic-id="portal-root" />
    </SaltProvider>
  );
}
