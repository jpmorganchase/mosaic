'use client';

/**
 * Client-only `<head>` additions for the catch-all route.
 *
 * Most page-level metadata (`title`, `description`, `og:*`,
 * `twitter:*`, `lastModified`, `breadcrumbs`) is now emitted by
 * `generateMetadata` in `page.tsx` and appears in the initial
 * server-rendered HTML <head>. That's the right place for anything
 * crawlers / link-unfurlers need to see before JS runs.
 *
 * What stays here:
 *   - The signed-in user's avatar `<link rel="preload" as="image">`.
 *     This depends on the Auth.js session, which can change after
 *     mount (sign-in / sign-out) and varies per request in a way
 *     that can't usefully be SSR'd into static metadata. Rendered
 *     as a React element so React 19's automatic <head> hoisting
 *     picks it up — no `next/head` shim required.
 *
 * If a new piece of head metadata depends only on per-route
 * frontmatter, add it to `generateMetadata`, not here. In
 * particular: do NOT re-introduce the legacy `<Metadata>` component
 * (`@jpmorganchase/mosaic-site-components/Metadata`). It reads from
 * `useMeta()` which prefixes the title with the
 * `header.searchNamespace` (e.g. "mosaic | Getting Started") and
 * would duplicate every tag that `generateMetadata` already
 * server-renders.
 */
import { useSession } from 'next-auth/react';

export function RouteMetadata() {
  const { data: session } = useSession();
  const avatar = session?.user?.image;
  if (!avatar) return null;
  return <link as="image" href={avatar} rel="preload" />;
}
