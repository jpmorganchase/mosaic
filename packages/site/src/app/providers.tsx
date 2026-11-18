'use client';

/** Global session/theme providers and the separately seeded page content store. */
import { ThemeProvider } from '@jpmorganchase/mosaic-components';
import { ColorModeProvider } from '@jpmorganchase/mosaic-store';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { SessionProvider } from 'next-auth/react';
import { SearchProvider } from '@jpmorganchase/mosaic-site-components/SearchProvider';
import { NextAuthAdapter } from '@jpmorganchase/mosaic-site-components/auth/next-auth';
import { AuthoringSiteProvider } from '@jpmorganchase/mosaic-content-editor-plugin/authoringSite';

export { StoreShell } from '@jpmorganchase/mosaic-layouts/host';

export function Providers({
  authEnabled,
  authoringUrl,
  searchMode = 'server',
  children
}: {
  /** Server-side AUTH_ENABLED passed down by the root layout. */
  authEnabled: boolean;
  /** `MOSAIC_AUTHORING_URL`: where pages are edited, when it isn't this site. */
  authoringUrl?: string;
  searchMode?: 'server' | 'browser';
  children: React.ReactNode;
}) {
  const content = (
    <AuthoringSiteProvider url={authoringUrl}>
      <ColorModeProvider>
        <ThemeProvider themeClassName={themeClassName}>
          <SearchProvider mode={searchMode}>{children}</SearchProvider>
        </ThemeProvider>
      </ColorModeProvider>
    </AuthoringSiteProvider>
  );
  // No-auth hosts use the signed-out context default, with no session requests.
  // Auth-enabled hosts fetch the session after mount, keeping it out of SSR.
  return authEnabled ? (
    <SessionProvider>
      <NextAuthAdapter>{content}</NextAuthAdapter>
    </SessionProvider>
  ) : (
    content
  );
}
