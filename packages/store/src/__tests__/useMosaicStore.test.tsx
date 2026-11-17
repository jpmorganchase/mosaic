import { StrictMode, useLayoutEffect } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { describe, expect, test, vi } from 'vitest';

import { StoreProvider, useStore, type SiteState } from '../store';
import { useMosaicStore } from '../useMosaicStore';

describe('useMosaicStore', () => {
  test('seeds synchronously and retains independent instances in Strict Mode', () => {
    const firstSeed = { title: 'First' };
    const secondSeed = { title: 'Second' };
    const { result, rerender } = renderHook(
      () => [useMosaicStore(firstSeed), useMosaicStore(secondSeed)],
      { wrapper: StrictMode }
    );
    const [first, second] = result.current;
    expect(first.getState().title).toBe('First');
    expect(second.getState().title).toBe('Second');
    expect(first).not.toBe(second);
    first.setState({ title: 'Local update' });
    rerender();
    expect(result.current[0]).toBe(first);
    expect(first.getState().title).toBe('Local update');
    expect(second.getState().title).toBe('Second');
  });

  test('new seed identity replaces data and deletes omitted fields before paint', () => {
    const observed = vi.fn();
    function Content() {
      const title = useStore(state => state.title);
      const description = useStore(state => state.description);
      return <output>{`${title}:${description ?? ''}`}</output>;
    }
    function Page({ seed }: { seed: Partial<SiteState> }) {
      const store = useMosaicStore(seed);
      useLayoutEffect(() => observed(store.getState()));
      return (
        <StoreProvider value={store}>
          <Content />
        </StoreProvider>
      );
    }
    const { rerender } = render(<Page seed={{ title: 'Old', description: 'Removed' }} />);
    rerender(<Page seed={{ title: 'Refreshed' }} />);
    expect(screen.getByRole('status').textContent).toBe('Refreshed:');
    expect(observed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Refreshed',
        description: undefined
      })
    );
  });

  test('server and first client render agree without hydration recovery', async () => {
    function Page() {
      const store = useMosaicStore({ title: 'Server seed' });
      return <output>{store.getState().title}</output>;
    }
    const element = (
      <StrictMode>
        <Page />
      </StrictMode>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    const serverHtml = container.innerHTML;
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });
    expect(container.innerHTML).toBe(serverHtml);
    expect(onRecoverableError).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
