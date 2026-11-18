import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { signIn } from 'next-auth/react';

import { NextAuthAdapter } from '../../auth/next-auth';

const pathname = vi.hoisted(() => ({ current: '/docs/page' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' })
}));
vi.mock('@jpmorganchase/mosaic-content-editor-plugin/useEditMode', () => ({
  useEditModeActions: () => ({ startEditing: vi.fn(), stopEditing: vi.fn() }),
  useIsEditing: () => false
}));
vi.mock('@jpmorganchase/mosaic-content-editor-plugin/components/EditorControls', () => ({
  EditorControls: ({ enabled }: { enabled: boolean }) => (
    <div data-mosaic-testid="editor-controls" data-enabled={String(enabled)} />
  )
}));
const authoringSite = vi.hoisted(() => ({
  current: undefined as undefined | { host: string; href: (path: string) => string }
}));
vi.mock('@jpmorganchase/mosaic-content-editor-plugin/authoringSite', () => ({
  useAuthoringSite: () => authoringSite.current
}));
const capabilities = vi.hoisted(() => ({ current: {} as { writable?: boolean } }));
vi.mock('@jpmorganchase/mosaic-store', () => ({
  useColorMode: () => 'light',
  useSourceCapabilities: () => capabilities.current,
  useStoreActions: () => ({ setColorMode: vi.fn() })
}));

vi.mock('../../SearchInput', () => ({ SearchInput: () => null }));

const { AppHeaderControls } = await import('../index');
const Header = () => (
  <NextAuthAdapter>
    <AppHeaderControls />
  </NextAuthAdapter>
);

const loginHref = (html: string) => html.match(/href="([^"]*api\/auth\/signin[^"]*)"/)?.[1];

describe('GIVEN the AppHeaderControls Login link', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LOGIN', 'true');
    pathname.current = '/docs/page';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('THEN its callback is the router pathname, not `window.location`', () => {
    // jsdom's `window.location` is `/`, which the server can't see; the
    // href must come from the pathname both sides agree on.
    expect(window.location.pathname).toBe('/');

    render(<Header />);

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/api/auth/signin?callbackUrl=%2Fdocs%2Fpage'
    );
  });

  test('THEN the server render matches the browser render', () => {
    const serverHref = loginHref(renderToString(<Header />))?.replace(/&amp;/g, '&');
    render(<Header />);

    expect(serverHref).toBe(screen.getByRole('link', { name: 'Login' }).getAttribute('href'));
  });

  test('THEN pages under /api/auth/ call back to the home page', () => {
    pathname.current = '/api/auth/signin';

    render(<Header />);

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/api/auth/signin?callbackUrl=%2F'
    );
  });

  test('THEN an ordinary click calls the adapter but modified clicks keep the real link', () => {
    render(<Header />);
    const link = screen.getByRole('link', { name: 'Login' });
    fireEvent.click(link);
    expect(signIn).toHaveBeenCalledTimes(1);
    const prevented: boolean[] = [];
    const stopNativeNavigation = (event: MouseEvent) => {
      prevented.push(event.defaultPrevented);
      event.preventDefault(); // jsdom cannot follow the fallback link.
    };
    document.addEventListener('click', stopNativeNavigation);
    try {
      for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
        fireEvent.click(link, { [modifier]: true });
      }
      fireEvent.click(link, { button: 1 });
    } finally {
      document.removeEventListener('click', stopNativeNavigation);
    }
    expect(prevented).toEqual([false, false, false, false, false]);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  test('THEN no provider means no Login control, even when the legacy login flag is enabled', () => {
    render(<AppHeaderControls />);
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select an action' })).toBeInTheDocument();
  });
});

describe('GIVEN pages are edited on an authoring site', () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  beforeEach(() => {
    authoringSite.current = {
      host: 'dev.example.com',
      href: path => `https://dev.example.com${path}`
    };
    capabilities.current = { writable: true };
    pathname.current = '/docs/page';
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign }
    });
  });
  afterEach(() => {
    authoringSite.current = undefined;
    capabilities.current = {};
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  test('THEN the editor controls show without login enabled here', () => {
    render(<AppHeaderControls />);
    expect(screen.getByTestId('editor-controls')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
  });

  test('THEN they stay hidden on a page no writable source owns', () => {
    capabilities.current = {};
    render(<AppHeaderControls />);
    expect(screen.queryByTestId('editor-controls')).not.toBeInTheDocument();
  });

  test('THEN the action menu opens the page on the authoring site', () => {
    render(<AppHeaderControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Select an action' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Document on dev.example.com' }));
    expect(assign).toHaveBeenCalledExactlyOnceWith('https://dev.example.com/docs/page?edit=1');
  });
});

describe('GIVEN pages are edited on this site', () => {
  afterEach(() => {
    capabilities.current = {};
    vi.unstubAllEnvs();
  });

  test('THEN the editor controls need login enabled', () => {
    capabilities.current = { writable: true };
    render(<AppHeaderControls />);
    expect(screen.queryByTestId('editor-controls')).not.toBeInTheDocument();

    vi.stubEnv('NEXT_PUBLIC_ENABLE_LOGIN', 'true');
    render(<Header />);
    expect(screen.getByTestId('editor-controls')).toHaveAttribute('data-enabled', 'false');
  });
});
