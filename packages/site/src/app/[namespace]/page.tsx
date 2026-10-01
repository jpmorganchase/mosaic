/**
 * `/<namespace>` on its own → the namespace's home document.
 *
 * Server builds also redirect this in `next.config.js`; this page covers
 * the static export, where those redirects aren't emitted.
 */
import { redirect } from 'next/navigation';
import { loadSitemap } from '@jpmorganchase/mosaic-site-middleware';

const isSnapshotBuild =
  (process.env.MOSAIC_MODE?.startsWith('snapshot') ?? false) &&
  process.env.NODE_ENV === 'production';

export async function generateStaticParams(): Promise<{ namespace: string }[]> {
  if (!isSnapshotBuild) return [];
  const namespaces = new Set(
    (await loadSitemap()).map(url => url.split('/').filter(Boolean)[0]).filter(Boolean)
  );
  return [...namespaces].map(namespace => ({ namespace }));
}

export default async function NamespaceIndex({
  params
}: {
  params: Promise<{ namespace: string }>;
}): Promise<never> {
  const { namespace } = await params;
  redirect(`/${namespace}/index`);
}
