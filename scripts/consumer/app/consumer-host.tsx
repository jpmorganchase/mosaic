'use client';

import { Fragment, StrictMode, useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@jpmorganchase/mosaic-components';
import { AppHeader } from '@jpmorganchase/mosaic-site-components/AppHeader/index';
import { Metadata } from '@jpmorganchase/mosaic-site-components/Metadata';
import { useMosaicAuth } from '@jpmorganchase/mosaic-site-components/auth';
import { SearchProvider } from '@jpmorganchase/mosaic-site-components/SearchProvider';
import { NamespaceFrame, StoreShell } from '@jpmorganchase/mosaic-layouts/host';
import { FrameSync } from '@jpmorganchase/mosaic-store/frame';
import { ColorModeProvider, useColorMode } from '@jpmorganchase/mosaic-store';
import { ExtensionProbe } from '@mosaic-test/extension';
import { Sitemap } from '@jpmorganchase/mosaic-sitemap-component';

const seed = { route: '/consumer/index', title: 'Packed consumer' };
const frame = { route: '/consumer/index' };
const layouts = { Plain: ({ children }: { children?: ReactNode }) => <main>{children}</main> };

function Content() {
  const auth = useMosaicAuth();
  const mode = useColorMode();
  useEffect(() => {
    document.documentElement.dataset.consumerMounts = String(
      Number(document.documentElement.dataset.consumerMounts ?? 0) + 1
    );
    document.documentElement.dataset.consumerHydrated = 'true';
  }, []);
  return (
    <StoreShell storeProps={seed} layoutComponents={layouts} defaultLayout="Plain">
      <FrameSync route={seed.route} />
      <Metadata Component={Fragment} />
      <output data-testid="auth">
        {auth.status}:{String(auth.loginEnabled)}
      </output>
      <output data-testid="host-mode">{mode}</output>
      <ExtensionProbe />
      <div data-testid="sitemap">
        <Sitemap href="/sitemap.xml" />
      </div>
    </StoreShell>
  );
}

export function ConsumerHost() {
  const [visible, setVisible] = useState(true);
  return (
    <StrictMode>
      <ColorModeProvider>
        <ThemeProvider themeClassName="">
          <SearchProvider>
            <NamespaceFrame data={frame} header={<AppHeader />}>
              <button onClick={() => setVisible(value => !value)}>Toggle content</button>
              {visible && <Content />}
            </NamespaceFrame>
          </SearchProvider>
        </ThemeProvider>
      </ColorModeProvider>
    </StrictMode>
  );
}
