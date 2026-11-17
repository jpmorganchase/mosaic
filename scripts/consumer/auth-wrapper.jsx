'use client';

// Exercise the real Auth.js runtime without claiming its beta declarations
// pass React 19's strict type check. Mosaic's adapter is checked separately.
import { SessionProvider } from 'next-auth/react';
import { NextAuthAdapter } from '@jpmorganchase/mosaic-site-components/auth/next-auth';

export function AuthWrapper({ children }) {
  return (
    <SessionProvider
      session={{ user: { name: 'Reader' }, expires: '2099-01-01T00:00:00Z' }}
      refetchOnWindowFocus={false}
    >
      <NextAuthAdapter loginEnabled>{children}</NextAuthAdapter>
    </SessionProvider>
  );
}
