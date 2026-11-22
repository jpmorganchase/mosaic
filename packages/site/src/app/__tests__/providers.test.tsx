// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';

const { childrenOnly } = vi.hoisted(() => ({
  childrenOnly: ({ children }: { children?: ReactNode }) => children
}));
vi.mock('@jpmorganchase/mosaic-components', () => ({
  ThemeProvider: ({ children }: { children?: ReactNode }) => children,
  ImageProvider: ({ children }: { children?: ReactNode }) => children,
  LinkProvider: ({ children }: { children?: ReactNode }) => children
}));
vi.mock('@jpmorganchase/mosaic-layouts', () => ({ LayoutProvider: childrenOnly, layouts: {} }));
vi.mock('@jpmorganchase/mosaic-layouts/host', () => ({ StoreShell: childrenOnly }));
vi.mock('@jpmorganchase/mosaic-site-components/BaseUrlProvider', () => ({
  BaseUrlProvider: childrenOnly
}));
vi.mock('@jpmorganchase/mosaic-site-components/Image/index', () => ({ Image: () => null }));
vi.mock('@jpmorganchase/mosaic-site-components/Link', () => ({ Link: () => null }));
vi.mock('@jpmorganchase/mosaic-theme', () => ({ themeClassName: '' }));
vi.mock('../RuntimeAuthoringProvider', () => ({ RuntimeAuthoringProvider: childrenOnly }));
vi.mock('@jpmorganchase/mosaic-site-components/SearchProvider', () => ({
  SearchProvider: childrenOnly
}));

import { Providers } from '../providers';
import { useMosaicAuth } from '@jpmorganchase/mosaic-site-components/auth';

function Probe() {
  const { status, loginEnabled } = useMosaicAuth();
  return <output>{`${status}:${loginEnabled}`}</output>;
}

afterEach(cleanup);

describe('reference no-auth providers', () => {
  test('do not mount Auth.js or fetch a session across Strict Mode remounts', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const first = render(
        <StrictMode>
          <Providers authEnabled={false}>
            <Probe />
          </Providers>
        </StrictMode>
      );
      expect(first.container.textContent).toBe('unauthenticated:false');
      first.unmount();
      render(
        <StrictMode>
          <Providers authEnabled={false}>
            <Probe />
          </Providers>
        </StrictMode>
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
