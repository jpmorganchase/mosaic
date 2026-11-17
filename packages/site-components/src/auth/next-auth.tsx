'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';

import { MosaicAuthProvider, type MosaicAuthValue } from './index';

function toCallbackPath(path: string): string {
  return path.startsWith('/api/auth/') ? '/' : path;
}

// Read query/hash at click time so the fallback link has matching server/client HTML.
function getCallbackPath(): string {
  return toCallbackPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}

/** Mount inside Auth.js's SessionProvider only when the host enables authentication. */
export function NextAuthAdapter({
  children,
  loginEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGIN === 'true'
}: {
  children?: ReactNode;
  loginEnabled?: boolean;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const value = useMemo<MosaicAuthValue>(
    () => ({
      status,
      user: session?.user ?? null,
      loginEnabled,
      signInHref: `/api/auth/signin?callbackUrl=${encodeURIComponent(
        toCallbackPath(pathname ?? '/')
      )}`,
      async signIn() {
        await signIn(undefined, { callbackUrl: getCallbackPath() });
      },
      async signOut() {
        await signOut({ callbackUrl: getCallbackPath() });
      }
    }),
    [session, status, loginEnabled, pathname]
  );
  return <MosaicAuthProvider value={value}>{children}</MosaicAuthProvider>;
}
