import { ColorModeProvider } from '@jpmorganchase/mosaic-store';
import { SaltProvider, Spinner } from '@salt-ds/core';
import { act } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';

import { ThemeProvider } from '../ThemeProvider';

function mockViewport(initialWidth: number) {
  let width = initialWidth;
  const queries: Array<{ query: MediaQueryList; notify: () => void }> = [];
  const matches = (query: string) => width >= Number(query.match(/min-width:\s*(\d+)/)?.[1]);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (media: string) => {
      const listeners = new Set<() => void>();
      const query = {
        media,
        get matches() {
          return matches(media);
        },
        addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener)
      } as MediaQueryList;
      queries.push({ query, notify: () => listeners.forEach(listener => listener()) });
      return query;
    }
  });
  return (nextWidth: number) => {
    const previous = queries.map(entry => ({ ...entry, matched: entry.query.matches }));
    width = nextWidth;
    previous.forEach(({ query, matched, notify }) => {
      if (query.matches !== matched) notify();
    });
  };
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const initialMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const initialHtmlAttributes = [...document.documentElement.attributes].map(({ name, value }) => [
  name,
  value
]);

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  localStorage.clear();
  if (initialMatchMedia) Object.defineProperty(window, 'matchMedia', initialMatchMedia);
  else Reflect.deleteProperty(window, 'matchMedia');
  for (const attribute of [...document.documentElement.attributes]) {
    document.documentElement.removeAttribute(attribute.name);
  }
  for (const [name, value] of initialHtmlAttributes) {
    document.documentElement.setAttribute(name, value);
  }
  vi.restoreAllMocks();
});

test.each([
  [390, 'touch', '0 0 44 44'],
  [959, 'touch', '0 0 44 44'],
  [960, 'low', '0 0 36 36'],
  [1200, 'low', '0 0 36 36']
] as const)(
  'hydrates nested providers and Spinner at a %ipx viewport, then follows viewport changes',
  async (width, density, viewBox) => {
    const resize = mockViewport(width);
    localStorage.setItem(
      'mosaic-theme-pref',
      JSON.stringify({ state: { colorMode: 'dark' }, version: 0 })
    );
    const app = (
      <ColorModeProvider>
        <ThemeProvider>
          <SaltProvider>
            <Spinner id="hydrated-spinner" disableAnnouncer />
          </SaltProvider>
        </ThemeProvider>
      </ColorModeProvider>
    );
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')!;
    let serverHtml: string;
    try {
      // Server rendering must not see jsdom's viewport. Keep Salt's real
      // components so both its nested class and SVG geometry are exercised.
      Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
      serverHtml = renderToString(app);
    } finally {
      Object.defineProperty(globalThis, 'window', windowDescriptor);
    }
    container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const spinner = container.querySelector('#hydrated-spinner');
    const nestedProvider = container.querySelector('.salt-provider');
    expect(spinner).toHaveAttribute('viewBox', '0 0 36 36');
    expect(nestedProvider).toHaveClass('salt-density-low');

    // The reference site's inline script has already selected the root class.
    document.documentElement.classList.add(`salt-density-${density}`);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      root = hydrateRoot(container!, app, { onRecoverableError });
    });
    expect(document.documentElement).toHaveAttribute('data-mode', 'dark');
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector('#hydrated-spinner')).toBe(spinner);
    expect(container.querySelector('.salt-provider')).toBe(nestedProvider);
    expect(spinner).toHaveAttribute('viewBox', viewBox);
    expect(nestedProvider).toHaveClass(`salt-density-${density}`);
    expect(document.documentElement).toHaveClass(`salt-density-${density}`);
    expect(document.documentElement).not.toHaveClass(
      `salt-density-${density === 'touch' ? 'low' : 'touch'}`
    );

    await act(async () => resize(390));
    expect(spinner).toHaveAttribute('viewBox', '0 0 44 44');
    expect(nestedProvider).toHaveClass('salt-density-touch');
    expect(document.documentElement).toHaveClass('salt-density-touch');
    expect(document.documentElement).not.toHaveClass('salt-density-low');
    await act(async () => resize(1200));
    expect(spinner).toHaveAttribute('viewBox', '0 0 36 36');
    expect(nestedProvider).toHaveClass('salt-density-low');
    expect(document.documentElement).toHaveClass('salt-density-low');
    expect(document.documentElement).not.toHaveClass('salt-density-touch');
    expect(consoleError).not.toHaveBeenCalled();
  }
);
