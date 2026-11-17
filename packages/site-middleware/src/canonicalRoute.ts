/** Preserve Mosaic's canonical-path validation without importing content loaders. */
export function canonicalRoute(frontmatter: Record<string, unknown>, fallback: string): string {
  return isSafeContentPath(frontmatter.route) ? frontmatter.route : fallback;
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
