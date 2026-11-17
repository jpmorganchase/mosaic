import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeProvider, TabMenuItemType } from '@jpmorganchase/mosaic-components';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';
import { ColorModeProvider, StoreProvider, initializeStore } from '@jpmorganchase/mosaic-store';

import { AppHeader } from '../AppHeader';
import { SearchProvider } from '../../SearchProvider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/docs/page',
  useRouter: () => ({ push: vi.fn() })
}));
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

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const initialAttributes = [...document.documentElement.attributes].map(({ name, value }) => [
  name,
  value
]);
afterEach(() => {
  localStorage.clear();
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  else Reflect.deleteProperty(window, 'matchMedia');
  for (const attribute of [...document.documentElement.attributes])
    document.documentElement.removeAttribute(attribute.name);
  for (const [name, value] of initialAttributes) document.documentElement.setAttribute(name, value);
});

function viewport(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (media: string) => ({
      media,
      get matches() {
        return width >= Number(media.match(/min-width:\s*(\d+)/)?.[1] ?? Infinity);
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener)
    })
  });
  return (nextWidth: number) => {
    width = nextWidth;
    listeners.forEach(listener => listener());
  };
}

function header(
  menu: TabsMenu = [{ type: TabMenuItemType.LINK, title: 'Guide', link: '/docs/guide' }]
) {
  const store = initializeStore({ route: '/docs/page' });
  return (
    <ColorModeProvider>
      <ThemeProvider>
        <StoreProvider value={store}>
          <SearchProvider enabled={false}>
            <AppHeader homeLink="/docs/index" logo="/logo.svg" title="Docs" menu={menu} />
          </SearchProvider>
        </StoreProvider>
      </ThemeProvider>
    </ColorModeProvider>
  );
}

test.each([
  [390, 'light'],
  [1200, 'dark']
] as const)(
  'renders links and logo on the server and hydrates at %ipx in %s mode',
  async (width, mode) => {
    viewport(width);
    localStorage.setItem(
      'mosaic-theme-pref',
      JSON.stringify({ state: { colorMode: mode }, version: 0 })
    );
    const app = header();
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    document.body.appendChild(container);
    const logo = container.querySelector('img[src="/logo.svg"]');
    const home = container.querySelector('a[href="/docs/index"]');
    const guide = container.querySelector('a[href="/docs/guide"]');
    expect(logo).not.toBeNull();
    expect(home).toContainElement(logo as HTMLElement);
    expect(guide).toHaveTextContent('Guide');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, app, { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector('img[src="/logo.svg"]')).toBe(logo);
      expect(container.querySelector('a[href="/docs/guide"]')).toBe(guide);
      expect(document.documentElement).toHaveAttribute('data-mode', mode);
      const ids = [...container.querySelectorAll('[id]')].map(element => element.id);
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      if (root) await act(async () => root?.unmount());
      container.remove();
    }
  }
);

test('closes a mobile drawer portal when the desktop query matches', async () => {
  const resize = viewport(390);
  const user = userEvent.setup();
  render(header());
  await user.click(screen.getByRole('button', { name: 'show the tab navigation' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => resize(1200));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('closes a desktop menu portal when its trigger becomes mobile-only hidden', async () => {
  const resize = viewport(1200);
  const user = userEvent.setup();
  render(
    header([
      {
        type: TabMenuItemType.MENU,
        title: 'Resources',
        onSelect: vi.fn(),
        links: [{ type: TabMenuItemType.LINK, title: 'Guide', link: '/docs/guide' }]
      }
    ])
  );
  await user.click(screen.getByRole('button', { name: 'Resources' }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
  await act(async () => resize(390));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  await act(async () => resize(1200));
  await user.click(screen.getByRole('button', { name: 'Resources' }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
});
