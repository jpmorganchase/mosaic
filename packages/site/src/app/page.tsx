/**
 * App Router root index — replaces `pages/index.tsx`.
 *
 * Permanently redirects to the configured home document. Matches the
 * `/ → /mosaic/index` redirect in `next.config.js`'s `dynamicOnlyConfig`
 * so behaviour is identical in the static-export build (where the
 * `next.config.js` redirects are *not* emitted and this page handles
 * the index instead).
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

export default function RootIndex(): never {
  redirect('/mosaic/index');
}
