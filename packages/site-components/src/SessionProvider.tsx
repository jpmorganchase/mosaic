import React from 'react';
import { SessionProvider as NextSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }) {
  return <NextSessionProvider>{children}</NextSessionProvider>;
}
