import { useColorMode } from '@jpmorganchase/mosaic-store';
import { ssrClassName } from '@jpmorganchase/mosaic-theme';
import { SaltProvider, UNSTABLE_SaltProviderNext } from '@salt-ds/core';
import { type ReactNode, useEffect, useState } from 'react';

import classnames from 'clsx';

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

interface ThemeProviderProps {
  /** Applies to `SaltProvider` `theme` prop */
  themeClassName?: string;
  className?: string;
  children?: ReactNode;
  /** Enables Salt theme next */
  themeNext?: boolean;
}

export function ThemeProvider({
  themeClassName,
  className,
  themeNext,
  children
}: ThemeProviderProps) {
  const hasHydrated = useHasHydrated();
  const { colorMode } = useColorMode();

  const ssrClassname = hasHydrated ? undefined : ssrClassName;

  const ChosenSaltProvider = themeNext ? UNSTABLE_SaltProviderNext : SaltProvider;

  return (
    <ChosenSaltProvider mode={hasHydrated ? colorMode : 'light'} theme={themeClassName}>
      <div className={classnames(ssrClassname, className)}>
        {children}
        <div data-mosaic-id="portal-root" />
      </div>
    </ChosenSaltProvider>
  );
}
