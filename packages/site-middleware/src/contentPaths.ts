/** Backing paths use literal segment names; HTTP requests use encoded names. */
export function encodeContentPath(pathname: string): string {
  return pathname.split('/').map(encodeURIComponent).join('/');
}

/** Reject malformed or escaping paths before using them as snapshot filenames. */
export function decodeContentPath(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes('\\') || decoded.includes('\0')) return undefined;
  if (decoded.split('/').some(segment => segment === '.' || segment === '..')) return undefined;
  return decoded;
}
