import { encodeRoutePathname, isSourceRoute } from '@jpmorganchase/mosaic-schemas/routePath';
import { encodeContentPath } from './contentPaths.js';

/** Preserve Mosaic's canonical-path validation without importing content loaders. */
export function canonicalRoute(frontmatter: Record<string, unknown>, fallback: string): string {
  return isSafeContentPath(frontmatter.route) ? frontmatter.route : fallback;
}

/** Build a URL from the canonical route without changing its logical route value. */
export function canonicalRouteHref(frontmatter: Record<string, unknown>, fallback: string): string {
  const { route, fullPath, routeFileExtension } = frontmatter;
  if (!isSafeContentPath(route)) return fallback;
  const pageExtensions =
    typeof routeFileExtension === 'string' &&
    routeFileExtension.startsWith('.') &&
    routeFileExtension.includes('.', 1) &&
    typeof fullPath === 'string' &&
    fullPath.endsWith(routeFileExtension)
      ? [routeFileExtension]
      : undefined;
  const literal = isSourceRoute(route, fullPath, pageExtensions);
  return literal
    ? encodeContentPath(route)
    : encodeRoutePathname(route, { lowercase: typeof fullPath === 'string' });
}

export function isSafeContentPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 2 || value.length > 1024) return false;
  if (!value.startsWith('/') || value.includes('\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  return value
    .slice(1)
    .split('/')
    .every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
