/**
 * Pages with no route segments below the namespace: namespace roots such
 * as `/mosaic`, and root-level documents and aliases such as `/about`.
 * They render exactly like `[...route]/page.tsx`, which resolves whether
 * the path is a document, an alias or a folder index.
 *
 * They need their own page because the catch-all is required rather than
 * optional; see `staticRouteParams.ts` for why.
 */
import RoutePage, { generateMetadata as generateRouteMetadata } from './[...route]/page';
import {
  DYNAMIC_PROBE_NAMESPACE,
  loadStaticRouteParams,
  shouldPrerenderSnapshot
} from './staticRouteParams';

interface NamespacePageProps {
  params: Promise<{ namespace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams(): Promise<{ namespace: string }[]> {
  if (!shouldPrerenderSnapshot) return [{ namespace: DYNAMIC_PROBE_NAMESPACE }];
  return (await loadStaticRouteParams())
    .filter(({ route }) => route.length === 0)
    .map(({ namespace }) => ({ namespace }));
}

export function generateMetadata(props: NamespacePageProps) {
  return generateRouteMetadata(props);
}

export default function NamespacePage(props: NamespacePageProps) {
  return RoutePage(props);
}
