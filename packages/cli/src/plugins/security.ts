import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/**
 * Public placeholder values committed in dev env files. They must never
 * unlock anything in production.
 */
const DEV_PLACEHOLDER_SECRETS = new Set(['local-dev-workflows-secret']);

/** Returns the configured secret, or `undefined` if unset or a placeholder in production. */
export function readSecret(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  if (process.env.NODE_ENV === 'production' && DEV_PLACEHOLDER_SECRETS.has(value)) {
    return undefined;
  }
  return value;
}

/**
 * Constant-time string comparison for shared secrets. Different lengths
 * are rejected up front because `timingSafeEqual` throws on them; the
 * length of a secret isn't sensitive, its bytes are.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Reads a shared secret from a dedicated header (e.g. `x-mosaic-admin-secret`),
 * an `Authorization: Bearer <secret>` header, or the password of an
 * `Authorization: Basic` header (what a browser sends after its login prompt).
 */
export function extractSecret(headers: IncomingHttpHeaders, headerName: string): string | null {
  const custom = headers[headerName];
  if (typeof custom === 'string' && custom.length > 0) return custom;
  const authorization = headers.authorization;
  if (typeof authorization !== 'string') return null;
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }
  if (authorization.startsWith('Basic ')) {
    // Browser login prompt: the username is ignored, the password is the secret.
    const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    return separator >= 0 && separator < decoded.length - 1 ? decoded.slice(separator + 1) : null;
  }
  return null;
}

/**
 * `true` when `route` is a plain absolute POSIX route that can't escape
 * the directory it is resolved against: leading `/`, no `.`/`..` or empty
 * segments, no backslashes and no control characters.
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
