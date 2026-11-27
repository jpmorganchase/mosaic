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
export function isSourceRoute(
  route: string,
  fullPath: unknown,
  pageExtensions?: readonly string[]
): boolean {
  if (typeof fullPath !== 'string' || !fullPath.startsWith(route)) return false;
  if (route === fullPath) return true;
  const suffix = fullPath.slice(route.length);
  if (!pageExtensions) return /^\.[^./]+$/.test(suffix);
  // Strip the longest configured suffix, as the page alias plugin does.
  return (
    pageExtensions.includes(suffix) &&
    !pageExtensions.some(
      extension => extension.length > suffix.length && fullPath.endsWith(extension)
    )
  );
}

export function pageRoutePathname(
  route: string,
  fullPath: unknown,
  pageExtensions?: readonly string[]
): string {
  const literal = isSourceRoute(route, fullPath, pageExtensions);
  // Authored permalinks resolve to aliases stored in lowercase, including
  // the characters represented by URL escapes.
  return encodeRoutePathname(route, {
    literal,
    lowercase: typeof fullPath === 'string' && !literal
  });
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
