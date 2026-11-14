import { test, expect } from '@playwright/test';

/**
 * App Router smoke tests.
 *
 * These tests don't navigate the UI — they assert on the App Router's
 * server-side behaviour directly via HTTP, so they're fast and immune
 * to UI churn. They lock in:
 *
 *  1. Pages are server-rendered with their real layout: the HTML has
 *     the page heading and no client-side-rendering bailout (a
 *     `useSearchParams()` call on the view path would add one).
 *  2. View pages don't download the Lexical editor, which is only
 *     loaded for `?edit=1` / `?new=1`.
 *  3. The Auth.js v5 route handlers respond cleanly (when the
 *     deployment enables auth).
 *  4. The legacy `POST /api/content/preview` REST endpoint is gone —
 *     content-editor preview is a React Server Action (see
 *     `src/app/[namespace]/[...route]/previewAction.ts`).
 */

test.describe('App Router server behaviour', () => {
  test('catch-all route serves server-rendered HTML with the real layout', async ({ request }) => {
    const res = await request.get('/mosaic/index');
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toMatch(/<html[\s>]/i);
    expect(body).toMatch(/<h1[\s>]/i);
    expect(body).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING');
  });

  test('view pages do not load the Lexical editor bundle', async ({ request }) => {
    const res = await request.get('/mosaic/index');
    const html = await res.text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
    expect(scripts.length).toBeGreaterThan(0);

    for (const src of scripts) {
      const script = await request.get(src);
      // Every minified Lexical build embeds its error-docs URL.
      expect(await script.text(), src).not.toContain('lexical.dev/docs/error');
    }
  });

  test('Auth.js providers endpoint returns the configured providers', async ({ request }) => {
    const res = await request.get('/api/auth/providers');
    test.skip(res.status() === 404, 'Auth is disabled on this deployment');
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
    // Answered by Auth.js or, on deployments without auth, by the stub
    // handlers in `src/auth.ts` — either way `<SessionProvider>` gets a
    // JSON "no session" and settles without a client error.
    const res = await request.get('/api/auth/session');
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).not.toContain('"user"');
  });

  test('legacy /api/content/preview REST endpoint has been removed in favour of a Server Action', async ({
    request
  }) => {
    // Posting to the old path should NOT resolve to a 2xx — Next.js
    // returns a 404 (no route handler) or a 405 (method not allowed if
    // the path collides with the catch-all page).
    const res = await request.post('/api/content/preview', {
      data: { source: '# hello world' },
      headers: { 'content-type': 'application/json' },
      // Don't let Playwright throw on non-2xx — we *expect* one here.
      failOnStatusCode: false
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
