import { useColorMode } from '@jpmorganchase/mosaic-store';
import { ssrClassName } from '@jpmorganchase/mosaic-theme';
import { type Density, SaltProviderNext } from '@salt-ds/core';
import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useState } from 'react';
import { useIsMobileView } from './useIsMobileView';

interface ThemeProviderProps {
  /** Applies to `SaltProvider` `theme` prop */
  themeClassName?: string;
  children?: ReactNode;
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

/** This has to be within a SaltProvider to get correct breakpoint, not the same level as SaltProvider */
function DensitySetter({ setDensity }: { setDensity: Dispatch<SetStateAction<Density>> }) {
  const isMobileOrTablet = useIsMobileView();

  const density = isMobileOrTablet ? 'touch' : 'low';

  useEffect(() => {
    setDensity(density);
  }, [density, setDensity]);

  return null;
}

export function ThemeProvider({ themeClassName, children }: ThemeProviderProps) {
  const hasHydrated = useHasHydrated();
  const colorMode = useColorMode();

  // Density also changes descendants' markup, including nested providers and
  // Spinner SVGs. Match the server on the first hydration render, then let
  // DensitySetter apply the viewport's density and track breakpoint changes.
  // The site's inline script can still set the root class before first paint.
  const [density, setDensity] = useState<Density>('low');
  const ssrClassname = hasHydrated ? undefined : ssrClassName;

  return (
    <SaltProviderNext
      mode={colorMode}
      theme={themeClassName}
      density={density}
      accent="teal"
      corner="rounded"
      actionFont="Amplitude"
      headingFont="Amplitude"
    >
      <DensitySetter setDensity={setDensity} />
      <div className={ssrClassname}>{children}</div>
      <div data-mosaic-id="portal-root" />
    </SaltProviderNext>
  );
}
