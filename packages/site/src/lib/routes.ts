/**
 * `true` when `route` is a plain absolute POSIX route that can't escape
 * the directory it is resolved against: leading `/`, no `.`/`..` or empty
 * segments, no backslashes and no control characters.
 *
 * Mirrors `isSafeRoute` in `@jpmorganchase/mosaic-cli`; the site checks
 * routes before they leave for the workflows backend, the CLI checks them
 * again on arrival.
 */
export function isSafeRoute(route: unknown, maxLength = 1024): route is string {
  if (typeof route !== 'string' || route.length < 2 || route.length > maxLength) return false;
  if (!route.startsWith('/') || route.includes('\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(route)) return false;
  return route
    .slice(1)
    .split('/')
    .every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
