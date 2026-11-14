import { afterEach, expect, test, vi } from 'vitest';
import { validateHost } from '../env';

afterEach(() => vi.restoreAllMocks());
test.each(['localhost', '127.0.0.1', '0.0.0.0', '::1', '::', 'mosaic-fs.internal'])(
  'accepts a bind hostname or address: %s',
  host => expect(validateHost(host)).toBe(host)
);
test.each(['', ' ', 'http://localhost', 'localhost:8080', 'host/path', '-invalid', 'bad host'])(
  'rejects a bind address with URL syntax or invalid labels: %s',
  host => expect(() => validateHost(host)).toThrow('Invalid --host')
);
