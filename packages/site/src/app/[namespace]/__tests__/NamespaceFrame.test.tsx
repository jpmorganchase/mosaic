// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useAppHeader } from '@jpmorganchase/mosaic-store';
import { useResolveRelativeUrl } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';

// Keep the real frame store and URL context; the header probe exposes
// the links a host header resolves without loading its menus/editor.
vi.mock('@jpmorganchase/mosaic-site-components/AppHeader/index', () => ({
  AppHeader: () => {
    const { homeLink = '', logo = '' } = useAppHeader() ?? {};
    const href = useResolveRelativeUrl(homeLink);
    const src = useResolveRelativeUrl(logo);
    return (
      <a href={href}>
        <img src={src} alt="Homepage" />
      </a>
    );
  }
}));
vi.mock('@jpmorganchase/mosaic-components', () => ({
  ImageProvider: ({ children }: { children: ReactNode }) => children,
  LinkProvider: ({ children }: { children: ReactNode }) => children,
  hasProtocol: (url: string) => /^[a-z][a-z\d+.-]*:/i.test(url)
}));
vi.mock('@jpmorganchase/mosaic-layouts', () => ({
  FrameProvider: ({ children }: { children: ReactNode }) => children,
  LayoutHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>
}));
vi.mock('@jpmorganchase/mosaic-content-editor-plugin/useEditMode', () => ({
  EditModeProvider: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@jpmorganchase/mosaic-site-components/Image/index', () => ({ Image: () => null }));
vi.mock('@jpmorganchase/mosaic-site-components/Link', () => ({ Link: () => null }));
vi.mock('@jpmorganchase/mosaic-site-components/404', () => ({
  Page404: () => <h1>Page Not Found</h1>
}));
vi.mock('next/navigation', () => ({ usePathname: () => window.location.pathname }));
vi.mock('../../providers', () => ({
  StoreShell: ({ children }: { children: ReactNode }) => children
}));

import { NotFoundBody } from '../../NotFoundBody';
import { FrameSync, NamespaceFrame } from '../NamespaceFrame';

const sharedConfig = {
  header: { title: 'Docs', menu: [], homeLink: './index', logo: './logo.svg' }
};
const data = { route: '/docs/index', sharedConfig };

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('NamespaceFrame relative URLs', () => {
  test('uses the frame fallback route during the server render', () => {
    vi.stubGlobal('window', undefined);
    try {
      const html = renderToStaticMarkup(
        <NamespaceFrame data={data}>
          <FrameSync route="/docs/guide/index" sharedConfig={sharedConfig} />
          <p>Page</p>
        </NamespaceFrame>
      );

      expect(html).toContain('href="/docs/index"');
      expect(html).toContain('src="/docs/logo.svg"');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('uses the canonical page route before the first client paint', () => {
    render(
      <NamespaceFrame data={data}>
        <FrameSync route="/docs/guide/index" sharedConfig={sharedConfig} />
      </NamespaceFrame>
    );

    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute(
      'href',
      '/docs/guide/index'
    );
    expect(screen.getByRole('img', { name: 'Homepage' })).toHaveAttribute(
      'src',
      '/docs/guide/logo.svg'
    );
  });

  test('uses the target document route when the first visit is a root alias', () => {
    window.history.replaceState(null, '', '/quickstart');
    render(
      <NamespaceFrame data={{ route: '/quickstart/index' }}>
        <FrameSync route="/docs/start/index" sharedConfig={sharedConfig} />
      </NamespaceFrame>
    );

    expect(window.location.pathname).toBe('/quickstart');
    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute(
      'href',
      '/docs/start/index'
    );
    expect(screen.getByRole('img', { name: 'Homepage' })).toHaveAttribute(
      'src',
      '/docs/start/logo.svg'
    );
  });

  test('follows navigation when the shared config is unchanged, including Back', () => {
    const view = (route: string) => (
      <NamespaceFrame data={data}>
        <FrameSync route={route} sharedConfig={sharedConfig} />
      </NamespaceFrame>
    );
    const { rerender } = render(view('/docs/guide/index'));
    const header = screen.getByRole('banner');

    rerender(view('/docs/api/page'));
    expect(screen.getByRole('banner')).toBe(header);
    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute(
      'href',
      '/docs/api/index'
    );

    rerender(view('/docs/guide/index'));
    expect(screen.getByRole('banner')).toBe(header);
    expect(screen.getByRole('img', { name: 'Homepage' })).toHaveAttribute(
      'src',
      '/docs/guide/logo.svg'
    );
  });

  test('restores the current fallback route and config on a missing page', () => {
    const { rerender } = render(
      <NamespaceFrame data={data}>
        <FrameSync route="/docs/guide/index" sharedConfig={sharedConfig} />
      </NamespaceFrame>
    );
    const refreshedData = {
      route: '/docs/index',
      sharedConfig: {
        header: { ...sharedConfig.header, homeLink: './home', logo: './new-logo.svg' }
      }
    };

    rerender(
      <NamespaceFrame data={refreshedData}>
        <FrameSync />
      </NamespaceFrame>
    );

    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute('href', '/docs/home');
    expect(screen.getByRole('img', { name: 'Homepage' })).toHaveAttribute(
      'src',
      '/docs/new-logo.svg'
    );
  });

  test('loads section navigation after a 404 mounts and falls back for other sections', async () => {
    const sectionConfig = { header: { ...sharedConfig.header, logo: './guide-logo.svg' } };
    const loadSharedConfigAction = vi
      .fn()
      .mockResolvedValueOnce(sectionConfig)
      .mockRejectedValueOnce(new Error('Config unavailable'));
    const view = () => (
      <NamespaceFrame data={data}>
        <NotFoundBody loadSharedConfigAction={loadSharedConfigAction} />
      </NamespaceFrame>
    );

    window.history.replaceState(null, '', '/docs/guide/missing');
    const { rerender } = render(view());

    expect(screen.getByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute('href', '/docs/index');
    expect(loadSharedConfigAction).toHaveBeenCalledWith('/docs/guide/missing');
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute(
        'href',
        '/docs/guide/index'
      );
      expect(screen.getByRole('img', { name: 'Homepage' })).toHaveAttribute(
        'src',
        '/docs/guide/guide-logo.svg'
      );
    });

    window.history.replaceState(null, '', '/docs/api/missing');
    rerender(view());

    expect(screen.getByRole('link', { name: 'Homepage' })).toHaveAttribute('href', '/docs/index');
    expect(loadSharedConfigAction).toHaveBeenCalledWith('/docs/api/missing');
  });
});
