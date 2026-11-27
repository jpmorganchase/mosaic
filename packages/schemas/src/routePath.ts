/** Encode a route for use in a link, keeping escapes in authored permalinks. */
export function encodeRoutePathname(pathname: string): string {
  return pathname
    .split('/')
    .map(segment => {
      let value: string;
      try {
        value = decodeURIComponent(segment);
      } catch {
        value = segment;
      }
      return encodeURIComponent(value).replace(/[()]/g, character =>
        character === '(' ? '%28' : '%29'
      );
    })
    .join('/');
}
