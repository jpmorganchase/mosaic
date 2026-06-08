import { test, expect } from '@playwright/test';

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
 *  3. The legacy `POST /api/content/preview` REST endpoint is gone —
 *     content-editor preview is now a React Server Action (see
 *     `src/app/[...route]/previewAction.ts`). The test asserts the
 *     old surface is no longer reachable so we don't accidentally
 *     re-introduce two MDX pipelines.
 *
 * Static-export coverage is provided by the separate
 * `static-export.test.ts` integration that runs against an already-built
 * `out/` directory in CI.
 */

test.describe('App Router server behaviour', () => {
  test('catch-all RSC route serves MDX as HTML, not as a JSON compiledSource', async ({
    request
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

  test('legacy /api/content/preview REST endpoint has been removed in favour of a Server Action', async ({
    request
  }) => {
    // The content-editor preview was migrated from a REST route
    // handler to the `compilePreview` React Server Action exported
    // by `src/app/[...route]/previewAction.ts`. Posting to the old
    // path should therefore NOT resolve to a 2xx — Next.js will
    // return a 404 (no route handler) or a 405 (method not allowed
    // if the path collides with the catch-all page). Anything in
    // the 2xx range means the legacy surface has crept back in and
    // we're running two MDX compile pipelines again, which is the
    // exact regression WS-7 was meant to prevent.
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
