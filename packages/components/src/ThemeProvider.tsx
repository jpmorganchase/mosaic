import React, { ReactNode, useEffect, useState } from 'react';
import { SaltProvider, UNSTABLE_SaltProviderNext } from '@salt-ds/core';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import { ssrClassName } from '@jpmorganchase/mosaic-theme';

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
  /** Enables Salt theme next */
  themeNext?: boolean;
}

export function ThemeProvider({ className, themeNext, children }: ThemeProviderProps) {
  const hasHydrated = useHasHydrated();
  const colorMode = useColorMode();

  const ssrClassname = hasHydrated ? undefined : ssrClassName;

  const ChosenSaltProvider = themeNext ? UNSTABLE_SaltProviderNext : SaltProvider;

  return (
    <ChosenSaltProvider mode={hasHydrated ? colorMode : 'light'}>
      <div className={classnames(ssrClassname, className)}>
        {children}
        <div data-mosaic-id="portal-root" />
      </div>
    </ChosenSaltProvider>
  );
}
