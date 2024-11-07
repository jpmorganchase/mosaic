import { ReactNode } from 'react';
import { SaltProvider, UNSTABLE_SaltProviderNext } from '@salt-ds/core';
import { useColorMode } from '@jpmorganchase/mosaic-store';

import classnames from 'clsx';

interface ThemeProviderProps {
  className?: string;
  children?: ReactNode;
  /** Applies to `SaltProvider` `theme` prop */
  themeClassName?: string;
  /** Enables Salt theme next */
  themeNext?: boolean;
}

export function ThemeProvider({
  className,
  children,
  themeClassName,
  themeNext
}: ThemeProviderProps) {
  const { colorMode } = useColorMode();

  const ChosenSaltProvider = themeNext ? UNSTABLE_SaltProviderNext : SaltProvider;

  return (
    <ChosenSaltProvider mode={colorMode} enableStyleInjection={false} theme={themeClassName}>
      <div className={classnames('salt-theme', 'salt-density-medium', className)}>
        {children}
        <div data-mosaic-id="portal-root" />
      </div>
    </ChosenSaltProvider>
  );
}
