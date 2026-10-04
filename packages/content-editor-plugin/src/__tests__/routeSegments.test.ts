import { describe, expect, it } from 'vitest';

import { hasUnsafeRouteSegments } from '../utils/routeSegments';

describe('hasUnsafeRouteSegments', () => {
  it.each(['/mosaic/index.mdx', '/mosaic/configure/sources', '/a'])('accepts %s', route => {
    expect(hasUnsafeRouteSegments(route)).toBe(false);
  });

  it.each(['/mosaic/../x.mdx', '/mosaic/./x.mdx', '/mosaic//x.mdx', '/mosaic\\x.mdx', '/..'])(
    'rejects %s',
    route => {
      expect(hasUnsafeRouteSegments(route)).toBe(true);
    }
  );
});
