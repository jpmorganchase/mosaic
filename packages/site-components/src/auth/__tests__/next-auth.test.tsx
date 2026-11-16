import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  data: null as { user: { name: string; image: string } } | null,
  status: 'unauthenticated' as 'unauthenticated' | 'authenticated' | 'loading'
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/docs/page' }));
vi.mock('next-auth/react', () => ({
  useSession: () => auth,
  signIn: vi.fn(),
  signOut: vi.fn()
}));

import { signIn, signOut } from 'next-auth/react';
import { NextAuthAdapter } from '../next-auth';
import { useMosaicAuth } from '../index';

function Controls() {
  const value = useMosaicAuth();
  return (
    <>
      <output>{`${value.status}:${value.user?.name ?? 'none'}:${value.loginEnabled}`}</output>
      <a href={value.signInHref}>Fallback</a>
      <button
        onClick={() => {
          void value.signIn?.();
        }}
      >
        Sign in
      </button>
      <button
        onClick={() => {
          void value.signOut?.();
        }}
      >
        Sign out
      </button>
      {value.user?.image && <img src={value.user.image} alt="Avatar" />}
    </>
  );
}

describe('NextAuthAdapter', () => {
  beforeEach(() => {
    auth.data = null;
    auth.status = 'unauthenticated';
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LOGIN', 'true');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  test('preserves session user, loading and explicit login policy', () => {
    auth.status = 'loading';
    const { rerender } = render(
      <NextAuthAdapter>
        <Controls />
      </NextAuthAdapter>
    );
    expect(screen.getByRole('status')).toHaveTextContent('loading:none:true');
    auth.status = 'authenticated';
    auth.data = { user: { name: 'Reader', image: '/avatar.png' } };
    rerender(
      <NextAuthAdapter loginEnabled={false}>
        <Controls />
      </NextAuthAdapter>
    );
    expect(screen.getByRole('status')).toHaveTextContent('authenticated:Reader:false');
    expect(screen.getByAltText('Avatar')).toHaveAttribute('src', '/avatar.png');
  });

  test('uses the full click-time callback for both actions and a stable fallback URL', () => {
    render(
      <NextAuthAdapter>
        <Controls />
      </NextAuthAdapter>
    );
    window.history.replaceState(null, '', '/docs/current?tab=api#example');
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/api/auth/signin?callbackUrl=%2Fdocs%2Fpage'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signIn).toHaveBeenCalledWith(undefined, {
      callbackUrl: '/docs/current?tab=api#example'
    });
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/docs/current?tab=api#example' });
  });

  test('does not return to an auth endpoint after signing in or out', () => {
    window.history.replaceState(null, '', '/api/auth/signin?callbackUrl=bad#fragment');
    render(
      <NextAuthAdapter>
        <Controls />
      </NextAuthAdapter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signIn).toHaveBeenCalledWith(undefined, { callbackUrl: '/' });
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});
