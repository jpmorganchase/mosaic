import { test, expect } from '@playwright/test';

/**
 * Security headers from `next.config.js`. They must reach prerendered
 * pages as well as dynamic responses.
 */
test.describe('Security headers', () => {
  for (const path of ['/mosaic/index', '/api/content/ready']) {
    test(`are sent for ${path}`, async ({ request }) => {
      const res = await request.get(path);
      const headers = res.headers();
      expect(headers['content-security-policy']).toBe(
        "frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
      );
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['x-powered-by']).toBeUndefined();
    });
  }
});
