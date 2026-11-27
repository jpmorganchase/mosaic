import type { Metadata } from 'next';
import type { ResolvedContent } from './resolveContent.js';
import { canonicalRouteHref } from './canonicalRoute.js';

/** Pure document metadata. The host owns metadataBase, social branding and images. */
export function buildMosaicMetadata(resolved: ResolvedContent): Metadata {
  if (resolved.kind !== 'mdx') return {};
  const { frontmatter } = resolved.mdx;
  const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined;
  const description =
    typeof frontmatter.description === 'string' ? frontmatter.description : undefined;
  const lastModified =
    typeof frontmatter.lastModified === 'string' || typeof frontmatter.lastModified === 'number'
      ? String(frontmatter.lastModified)
      : undefined;
  const breadcrumbs = Array.isArray(frontmatter.breadcrumbs) ? frontmatter.breadcrumbs : undefined;
  const other: Record<string, string> = {};
  if (lastModified) other.lastModified = lastModified;
  if (breadcrumbs?.length) other.breadcrumbs = JSON.stringify(breadcrumbs);
  return {
    ...(title && { title }),
    ...(description && { description }),
    alternates: { canonical: canonicalRouteHref(frontmatter, resolved.pathname) },
    ...(Object.keys(other).length > 0 && { other })
  };
}

export { canonicalRoute, canonicalRouteHref } from './canonicalRoute.js';
