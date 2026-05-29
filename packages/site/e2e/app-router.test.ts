import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * App Router smoke tests (WS-7 verification).
 *
 * These tests don't navigate the UI — they assert on the App Router's
 * server-side behaviour directly via HTTP, so they're fast and immune
 * to UI churn. They lock in three guarantees:
 *
 *  1. The catch-all RSC route renders MDX pages as HTML (not as a
 *     JSON `compiledSource` blob) and the response payload does not
 *     contain a `next-mdx-remote` marker.
 *  2. The Auth.js v5 route handlers respond cleanly:
 *       - `/api/auth/providers` returns the configured providers
 *       - `/api/auth/session` returns `null` for an unauthenticated client
 *  3. The content-editor preview endpoint accepts a POST and returns
 *     JSON.
 *
 * Static-export coverage is provided by the separate
 * `static-export.test.ts` integration that runs against an already-built
 * `out/` directory in CI.
 */

test.describe('App Router server behaviour', () => {
  test('catch-all RSC route serves MDX as HTML, not as a JSON compiledSource', async ({
    request,
    baseURL
  }) => {
    const res = await request.get('/mosaic/index');
    expect(res.status()).toBe(200);

    const body = await res.text();
    // The legacy `next-mdx-remote` payload was a JSON blob containing
    // `"compiledSource":"..."`. Absence of that marker is the canonical
    // "MDX is server-rendered" check.
    expect(body).not.toContain('"compiledSource"');
    expect(body).not.toContain('next-mdx-remote/dist');
    // Sanity: the response is actually an HTML document.
    expect(body).toMatch(/<html[\s>]/i);
  });

  test('Auth.js providers endpoint returns the configured providers', async ({ request }) => {
    const res = await request.get('/api/auth/providers');
    expect(res.status()).toBe(200);

    const providers = await res.json();
    expect(providers).toMatchObject({
      github: {
        id: 'github',
        type: 'oauth',
        signinUrl: expect.stringContaining('/api/auth/signin/github'),
        callbackUrl: expect.stringContaining('/api/auth/callback/github')
      }
    });
  });

  test('Auth.js session endpoint returns null for an unauthenticated client', async ({
    request
  }) => {
    const res = await request.get('/api/auth/session');
    expect(res.status()).toBe(200);

    const body = await res.text();
    // Either literal `null` or `{}` is acceptable across Auth.js patch
    // releases; what matters is that it is NOT a 5xx and does NOT
    // contain a `user` field.
    expect(body).not.toContain('"user"');
  });

  test('content preview API accepts a POST and returns JSON', async ({ request }) => {
    const res = await request.post('/api/content/preview', {
      data: { source: '# hello world' },
      headers: { 'content-type': 'application/json' }
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] || '').toMatch(/application\/json/);
  });
});
