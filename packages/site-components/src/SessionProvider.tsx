import React, { Context, ReactNode } from 'react';
import type { Session } from '@jpmorganchase/mosaic-types';

let SessionContext: Context<Record<string, any>>;

export type SessionProviderProps = {
  children: ReactNode;
  session?: Session;
};

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  session = { isLoggedIn: false }
}) => {
  SessionContext = SessionContext || React.createContext(session);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};

export function useSession(): Record<string, any> {
  if (!SessionContext) {
    throw new Error(
      'Trying to use `useSession` outside of a `SessionContext`. This hook can only be used in a logged-in user journey.'
    );
  }

  return React.useContext(SessionContext);
}
