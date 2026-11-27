/** Encode a route for use in a link, keeping escapes in authored permalinks. */
export function encodeRoutePathname(
  pathname: string,
  { literal = false, lowercase = false } = {}
): string {
  return pathname
    .split('/')
    .map(segment => {
      let value = segment;
      if (!literal) {
        try {
          value = decodeURIComponent(segment);
        } catch {
          // A malformed escape is literal text.
        }
      }
      return encodeURIComponent(lowercase ? value.toLowerCase() : value).replace(
        /[()]/g,
        character => (character === '(' ? '%28' : '%29')
      );
    })
    .join('/');
}

/** A source route uses the literal filename, with or without its extension. */
export function isSourceRoute(route: string, fullPath: unknown): boolean {
  return (
    typeof fullPath === 'string' &&
    (route === fullPath ||
      (fullPath.startsWith(route) && /^\.[^./]+$/.test(fullPath.slice(route.length))))
  );
}

export function pageRoutePathname(route: string, fullPath: unknown): string {
  const literal = isSourceRoute(route, fullPath);
  // Authored permalinks resolve to aliases stored in lowercase, including
  // the characters represented by URL escapes.
  return encodeRoutePathname(route, { literal, lowercase: !literal });
}

/** Decode a URL pathname into literal path segments. */
export function decodeRoutePathname(pathname: string): string | undefined {
  if (pathname === '/') return pathname;
  if (!pathname.startsWith('/')) return undefined;
  try {
    const segments = pathname.slice(1).split('/').map(decodeURIComponent);
    // eslint-disable-next-line no-control-regex
    const unsafe = /[/\\\x00-\x1f\x7f]/;
    if (
      segments.some(
        segment => !segment || segment === '.' || segment === '..' || unsafe.test(segment)
      )
    )
      return undefined;
    return `/${segments.join('/')}`;
  } catch {
    return undefined;
  }
}
