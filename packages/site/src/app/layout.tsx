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

import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import '@jpmorganchase/mosaic-sitemap-component/index.css';
import '../css/index.css';

import { themeClassName } from '@jpmorganchase/mosaic-theme';
import { amplitude, openSans, ptMono } from '../fonts';
import { resolveSiteOrigin } from '../lib/siteOrigin';
import { LiveReload } from './LiveReload';
import { Providers } from './providers';

// Theme-mode script injected at the top of <body> to prevent dark-mode FOUC.
const themePrefScript = `
  try {
    const theme = JSON.parse(localStorage.getItem("mosaic-theme-pref")).state.colorMode || "light";
    document.documentElement.setAttribute("data-mode", theme);
  } catch (e) { /* no-op */ }
`;

// `<SessionProvider>` (in `./providers`) is rendered without a
// server-resolved `session` prop; the client fetches it lazily via
// `/api/auth/session` after mount. This keeps the root layout
// independent of Auth.js configuration. A missing `AUTH_SECRET` or
// OAuth env var degrades to `session: null` on the client instead of
// throwing in the layout (which would bypass `error.tsx` and surface
// as Next's generic "A server error occurred" fallback page).

// Static-export builds (`MOSAIC_OUTPUT=export`) skip the
// "missing NEXT_PUBLIC_SITE_URL" warning below because absolute URLs
// aren't meaningful for a snapshot served from an arbitrary origin.
const isStaticExport = process.env.MOSAIC_OUTPUT === 'export';

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
if (process.env.NODE_ENV === 'production' && !isStaticExport && !process.env.NEXT_PUBLIC_SITE_URL) {
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
      // sets `data-mode` on `<html>` from `localStorage`. That is a
      // deliberate divergence between the SSR output (no attribute) and
      // the live DOM (attribute set), so we ask React to skip the
      // hydration warning for *this* element only. Children are still
      // diffed normally.
      suppressHydrationWarning
      className={classnames(
        'salt-theme',
        'salt-theme-next',
        'salt-editorial',
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
        <Providers>{children}</Providers>
        {isDevelopment && <LiveReload />}
      </body>
    </html>
  );
}
