import path from 'node:path';

type PathImpl = Pick<typeof path, 'resolve' | 'relative' | 'isAbsolute' | 'sep'>;

/**
 * Resolves `relative` against `root` and returns the absolute path only
 * when it stays strictly inside `root`. Editor-supplied routes pass
 * through here before anything is read, written or renamed, so a route
 * such as `/docs/../../.github/workflows/x.yml` can't reach files outside
 * the source's content folder.
 *
 * `relative` is a POSIX route; a backslash is rejected because it would
 * be a separator on Windows. The check uses the platform's path rules
 * (`root` is a native path, e.g. `C:\…` on Windows) and the result uses
 * `/` separators, which every platform's `fs` accepts and which the
 * callers' `path.posix` helpers expect.
 *
 * @param pathImpl only for tests (e.g. `path.win32`)
 */
export function resolveInside(
  root: string,
  relative: string,
  pathImpl: PathImpl = path
): string | undefined {
  if (relative.includes('\\')) return undefined;
  const resolvedRoot = pathImpl.resolve(root);
  const candidate = pathImpl.resolve(resolvedRoot, ...relative.split('/').filter(Boolean));
  const rel = pathImpl.relative(resolvedRoot, candidate);
  if (
    rel === '' ||
    rel === '..' ||
    rel.startsWith(`..${pathImpl.sep}`) ||
    pathImpl.isAbsolute(rel)
  ) {
    return undefined;
  }
  return candidate.split(pathImpl.sep).join('/');
}

/**
 * Makes a user identifier (sid or email) safe to embed in a git branch
 * name and a worktree directory name.
 */
export function toSafeIdentifier(value: string): string {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 64);
  return safe || 'user';
}

/**
 * Strips the source's `prefixDir` from the start of a VFS route, giving
 * the route relative to the source's content folder. Returns `undefined`
 * when the route isn't under `prefixDir`, because it then belongs to a
 * different source and has no path inside this one.
 */
export function stripPrefixDir(route: string, prefixDir: string): string | undefined {
  const prefix = prefixDir.replace(/^\/+|\/+$/g, '');
  const relative = route.replace(/^\/+/, '');
  if (!prefix) return relative;
  return relative.startsWith(`${prefix}/`) ? relative.slice(prefix.length + 1) : undefined;
}
