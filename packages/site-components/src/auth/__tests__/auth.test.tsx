import { describe, expect, test, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';

import { MosaicAuthProvider, useMosaicAuth } from '../index';

function Status() {
  const { status, user, loginEnabled } = useMosaicAuth();
  return <output>{`${status}:${user?.name ?? 'none'}:${loginEnabled}`}</output>;
}

describe('Mosaic authentication context', () => {
  test('defaults to signed out without a provider or network requests, including Strict Mode', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      const first = render(
        <StrictMode>
          <Status />
        </StrictMode>
      );
      expect(screen.getByRole('status')).toHaveTextContent('unauthenticated:none:false');
      first.unmount();
      render(
        <StrictMode>
          <Status />
        </StrictMode>
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  test('accepts a host-owned user and loading state without Auth.js', () => {
    const { rerender } = render(
      <MosaicAuthProvider value={{ status: 'loading', user: null, loginEnabled: true }}>
        <Status />
      </MosaicAuthProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('loading:none:true');
    rerender(
      <MosaicAuthProvider
        value={{ status: 'authenticated', user: { name: 'Reader' }, loginEnabled: true }}
      >
        <Status />
      </MosaicAuthProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('authenticated:Reader:true');
  });
});
