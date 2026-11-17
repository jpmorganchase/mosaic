'use client';

/**
 * Error boundary for pages in a namespace (`/mosaic/...`).
 *
 * The root `error.tsx` replaces the namespace layout as well, so the
 * persistent header disappeared whenever a page failed. This boundary
 * sits inside the namespace layout, so the header stays and readers can
 * navigate away. `<FrameSync />` without a route hands the header back
 * to the namespace's own config, as the namespace 404 does.
 */
import RouteError from '../error';
import { FrameSync } from './NamespaceFrame';

export default function NamespaceError(props: Parameters<typeof RouteError>[0]) {
  return (
    <>
      <FrameSync />
      <RouteError {...props} />
    </>
  );
}
