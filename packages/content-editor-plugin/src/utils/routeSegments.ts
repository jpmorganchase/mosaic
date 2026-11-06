/**
 * `true` when an absolute route contains segments that could climb out of
 * (or be normalised differently by) the content folder on the server:
 * backslashes, empty segments (`//`) and `.` / `..` segments.
 *
 * The server validates routes again; this just lets the dialogs explain
 * the problem before a save is attempted.
 */
export function hasUnsafeRouteSegments(route: string): boolean {
  if (route.includes('\\')) return true;
  return route
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('/')
    .some(segment => segment === '' || segment === '.' || segment === '..');
}
