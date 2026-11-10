/**
 * 404 inside a namespace (`notFound()` from `[[...route]]/page.tsx`).
 *
 * Rendered within the namespace layout, so the persistent header is
 * already on screen. Next.js renders the boundary in ordinary page
 * responses, so section config is fetched only after a 404 mounts.
 */
import { getSiteConfig } from '../../lib/config';
import { NotFoundBody } from '../NotFoundBody';
import { loadNotFoundSharedConfig } from './notFoundChromeAction';

export default function NamespaceNotFound() {
  return (
    <NotFoundBody
      loadSharedConfigAction={getSiteConfig().staticExport ? undefined : loadNotFoundSharedConfig}
    />
  );
}
