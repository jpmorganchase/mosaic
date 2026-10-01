import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';

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
  EditorControls: () => null
}));
vi.mock('@jpmorganchase/mosaic-store', () => ({
  useColorMode: () => 'light',
  useSearchIndex: () => ({ searchEnabled: false }),
  useSourceCapabilities: () => ({}),
  useStoreActions: () => ({ setColorMode: vi.fn() })
}));

const { AppHeaderControls } = await import('../index');

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

    render(<AppHeaderControls />);

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/api/auth/signin?callbackUrl=%2Fdocs%2Fpage'
    );
  });

  test('THEN the server render matches the browser render', () => {
    const serverHref = loginHref(renderToString(<AppHeaderControls />))?.replace(/&amp;/g, '&');
    render(<AppHeaderControls />);

    expect(serverHref).toBe(screen.getByRole('link', { name: 'Login' }).getAttribute('href'));
  });

  test('THEN pages under /api/auth/ call back to the home page', () => {
    pathname.current = '/api/auth/signin';

    render(<AppHeaderControls />);

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/api/auth/signin?callbackUrl=%2F'
    );
  });
});
