/**
 * 404 inside a namespace (`notFound()` from `[...route]/page.tsx`).
 *
 * Rendered within the namespace layout, so the persistent header is
 * already on screen and this page loads no data. Next.js renders
 * not-found boundaries as part of every page response, which is why it
 * must stay data-free.
 */
import { NotFoundBody } from '../NotFoundBody';

export default function NamespaceNotFound() {
  return <NotFoundBody />;
}
