import { describe, expect, test, vi } from 'vitest';
import React from 'react';
import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';

import { IsomorphicSuspense } from '../IsomorphicSuspense';

describe('GIVEN an IsomorphicSuspense hydrating server HTML', () => {
  test('THEN hydration matches the server fallback AND the children render after it', async () => {
    let resolveContent: (module: { default: React.FC }) => void = () => {};
    const Lazy = React.lazy(
      () => new Promise<{ default: React.FC }>(resolve => (resolveContent = resolve))
    );
    // The server renders the fallback on its own.
    const container = document.createElement('div');
    container.innerHTML = '<span>Loading</span>';
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(
        container,
        <IsomorphicSuspense fallback={<span>Loading</span>}>
          <Lazy />
        </IsomorphicSuspense>,
        { onRecoverableError }
      );
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('Loading');

    await act(async () => resolveContent({ default: () => <p>Content</p> }));
    expect(container.innerHTML).toBe('<p>Content</p>');
    container.remove();
  });
});
