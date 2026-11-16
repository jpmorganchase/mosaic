'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** Authentication data used by Mosaic's UI, independent of an auth library. */
export interface MosaicAuthUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface MosaicAuthValue {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: MosaicAuthUser | null;
  loginEnabled: boolean;
  /** A real link for server rendering and modified clicks. */
  signInHref?: string;
  signIn?: () => void | Promise<void>;
  signOut?: () => void | Promise<void>;
}

const signedOut: MosaicAuthValue = {
  status: 'unauthenticated',
  user: null,
  loginEnabled: false
};
const MosaicAuthContext = createContext<MosaicAuthValue>(signedOut);

/** Supplies UI authentication only; hosts must authorize writes on the server. */
export function MosaicAuthProvider({
  value,
  children
}: {
  value: MosaicAuthValue;
  children?: ReactNode;
}) {
  return <MosaicAuthContext.Provider value={value}>{children}</MosaicAuthContext.Provider>;
}

/** Hosts without authentication need no provider. */
export const useMosaicAuth = (): MosaicAuthValue => useContext(MosaicAuthContext);
