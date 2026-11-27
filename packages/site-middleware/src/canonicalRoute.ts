import { encodeContentPath } from './contentPaths.js';

/** Preserve Mosaic's canonical-path validation without importing content loaders. */
export function canonicalRoute(frontmatter: Record<string, unknown>, fallback: string): string {
  return isSafeContentPath(frontmatter.route) ? frontmatter.route : fallback;
}

/** Build a URL from the canonical route without changing its logical route value. */
export function canonicalRouteHref(frontmatter: Record<string, unknown>, fallback: string): string {
  const { route, fullPath } = frontmatter;
  if (!isSafeContentPath(route)) return fallback;
  if (typeof fullPath === 'string') {
    // Source-derived routes use the literal filename, with or without its
    // extension. Even a valid looking percent escape in that name is literal.
    const suffix = fullPath.slice(route.length);
    if (
      route === fullPath ||
      (fullPath.startsWith(route) && suffix.startsWith('.') && !suffix.includes('/'))
    ) {
      return encodeContentPath(route);
    }
  }
  // Preserve explicitly authored permalinks, including URL-encoded ones.
  return route;
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
