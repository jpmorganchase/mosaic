import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ColorModeProvider } from '../ColorModeProvider';
import { initializeStore, reseedStore, StoreProvider, useStore } from '../store';
import { useColorMode } from '../useColorMode';
import { useStoreActions } from '../useStoreActions';

const key = 'mosaic-theme-pref';
const stored = (colorMode: string) => JSON.stringify({ state: { colorMode }, version: 0 });

function Mode({ name }: { name: string }) {
  const mode = useColorMode();
  const { setColorMode } = useStoreActions();
  return (
    <button onClick={() => setColorMode(mode === 'light' ? 'dark' : 'light')}>
      {name}: {mode}
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-mode');
});

describe('ColorModeProvider', () => {
  test('shares one preference across nested content stores, page replacement and reseeding', () => {
    const frame = initializeStore({ title: 'Header' });
    const firstPage = initializeStore({ title: 'First page' });
    const secondPage = initializeStore({ title: 'Second page' });
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    function Page() {
      const title = useStore(state => state.title);
      return (
        <>
          <span>{title}</span>
          <Mode name="Page" />
        </>
      );
    }
    const view = (page: typeof firstPage) => (
      <ColorModeProvider>
        <Mode name="Root" />
        <StoreProvider value={frame}>
          <Mode name="Header" />
          <StoreProvider value={page}>
            <Page />
          </StoreProvider>
        </StoreProvider>
      </ColorModeProvider>
    );
    const { rerender, unmount } = render(view(firstPage));
    fireEvent.click(screen.getByRole('button', { name: 'Page: light' }));
    expect(screen.getByRole('button', { name: 'Root: dark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Header: dark' })).toBeTruthy();
    expect(localStorage.getItem(key)).toBe(stored('dark'));
    expect(write).toHaveBeenCalledOnce();
    rerender(view(secondPage));
    act(() => reseedStore(secondPage, { title: 'Refreshed page' }));
    expect(screen.getByText('Refreshed page')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Page: dark' })).toBeTruthy();
    expect(write).toHaveBeenCalledOnce();
    const listeners = addListener.mock.calls.filter(([type]) => type === 'storage');
    expect(listeners).toHaveLength(1);
    unmount();
    expect(removeListener).toHaveBeenCalledWith('storage', listeners[0][1]);
  });

  test('restores the saved preference in StrictMode and follows other tabs without writing back', () => {
    localStorage.setItem(key, stored('dark'));
    const write = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <StrictMode>
        <ColorModeProvider>
          <Mode name="Theme" />
        </ColorModeProvider>
      </StrictMode>
    );
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: stored('light') }))
    );
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(write).not.toHaveBeenCalled();
  });

  test.each(['invalid JSON', stored('purple'), 'null'])(
    'ignores invalid saved preferences and storage events: %s',
    value => {
      localStorage.setItem(key, value);
      render(
        <ColorModeProvider>
          <Mode name="Theme" />
        </ColorModeProvider>
      );
      expect(screen.getByRole('button', { name: 'Theme: light' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Theme: light' }));
      act(() => window.dispatchEvent(new StorageEvent('storage', { key, newValue: value })));
      act(() =>
        window.dispatchEvent(
          new StorageEvent('storage', { key: 'other', newValue: stored('light') })
        )
      );
      expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy();
    }
  );

  test('keeps working when browser storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <ColorModeProvider>
        <Mode name="Theme" />
      </ColorModeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Theme: light' }));
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  test('requires an explicit owner', () => {
    expect(() => render(<Mode name="Theme" />)).toThrow('Missing ColorModeProvider in the tree');
  });
});
