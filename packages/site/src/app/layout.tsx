/**
 * App Router root layout.
 *
 * Metadata base: declared once here so every per-route
 * `generateMetadata` and the sitemap/robots conventions can produce
 * absolute URLs for the *current* deployment without each route having
 * to know the hostname. Set `NEXT_PUBLIC_SITE_URL` per environment;
 * the localhost fallback exists so dev and tests don't crash, but is
 * loud-warned in production so a missing env in prod isn't silent.
 */
import classnames from 'clsx';
import type { Metadata } from 'next';

// The preset includes Salt's static component styles before Mosaic overrides,
// so both the header and content are styled before hydration.
import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import '@jpmorganchase/mosaic-sitemap-component/index.css';
import '../css/index.css';

import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { AUTH_ENABLED } from '../auth';
import { AUTHORING_URL } from '../lib/authoring';
import { amplitude, openSans, ptMono } from '../fonts';
import { getSiteConfig } from '../lib/config';
import { resolveSiteOrigin } from '../lib/siteOrigin';
import { themePrefScript } from '../lib/themePrefScript';
import { LiveReload } from './LiveReload';
import { Providers } from './providers';

// When auth is enabled, `./providers` mounts SessionProvider and the
// Mosaic auth adapter without a server-resolved session. The client
// fetches it lazily via `/api/auth/session` after mount. This keeps the
// root layout independent of Auth.js configuration. A missing
// `AUTH_SECRET` or OAuth env var degrades to `session: null` on the
// client instead of throwing in the layout (which would bypass
// `error.tsx` and surface as Next's generic "A server error occurred"
// fallback page). Only the build-time `AUTH_ENABLED` flag is passed
// down. No-auth deployments mount neither auth provider.

// Static-export builds (`MOSAIC_OUTPUT=export`) skip the
// "missing NEXT_PUBLIC_SITE_URL" warning below because absolute URLs
// aren't meaningful for a snapshot served from an arbitrary origin.
const { staticExport: isStaticExport, siteUrl } = getSiteConfig();

// Dev-only auto-refresh: render `<LiveReload />` (opens an SSE
// connection to `/api/content/live` and calls `router.refresh()` on
// content changes) only in `next dev`. The SSE route itself also
// returns 404 outside development as defence-in-depth.
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * `metadataBase` drives absolute URL resolution for every per-route
 * `generateMetadata` output (notably `og:image` and `twitter:image`).
 * Resolved once at module init via the shared `resolveSiteOrigin`
 * helper so this layout, `app/sitemap.ts`, and `app/robots.ts` all
 * see the same origin from the same env var
 * (`NEXT_PUBLIC_SITE_URL`).
 *
 * We loud-warn here — and only here — when production is missing the
 * env, so the operator gets one clear message rather than three. The
 * sitemap/robots routes silently use the same fallback.
 */
const siteOrigin = resolveSiteOrigin();
if (process.env.NODE_ENV === 'production' && !isStaticExport && !siteUrl) {
  console.warn(
    `[mosaic-site] NEXT_PUBLIC_SITE_URL is not set in a production build; OG/Twitter cards and sitemap URLs will use ${siteOrigin} as a placeholder.`
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // The inline `themePrefScript` below runs before React hydrates and
      // replaces these default mode/density values with the stored preference
      // and viewport density. That intentional difference is limited to this
      // element; children still use their deterministic first-render state.
      suppressHydrationWarning
      // `ThemeProvider` sets these through Salt after hydration. Rendering
      // them here styles the server HTML as it will look once hydrated, so
      // pages don't change size. Keep them in step with its props.
      data-mode="light"
      data-accent="teal"
      data-corner="rounded"
      data-heading-font="Amplitude"
      data-action-font="Amplitude"
      className={classnames(
        'salt-theme',
        'salt-theme-next',
        'salt-editorial',
        'salt-density-low',
        themeClassName,
        ptMono.variable,
        openSans.variable,
        amplitude.variable
      )}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: required for synchronous theme application */}
        <script dangerouslySetInnerHTML={{ __html: themePrefScript }} />
      </head>
      <body>
        <Providers
          authEnabled={AUTH_ENABLED}
          authoringUrl={isStaticExport ? AUTHORING_URL : undefined}
          searchMode={isStaticExport ? 'browser' : 'server'}
        >
          {children}
        </Providers>
        {isDevelopment && <LiveReload />}
      </body>
    </html>
  );
}
