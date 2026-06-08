/**
 * Tests for `/api/content/ready`.
 *
 * The endpoint is a dev-only readiness probe for the upstream
 * Mosaic CLI; its contract is small but each branch matters
 * because the client poller in `<NotFoundRecovery />` directly
 * acts on the response shape:
 *
 *   - 404 in non-dev → client stops polling.
 *   - `ready: true` in snapshot modes → fast-path, no upstream call.
 *   - `ready: true` after a successful upstream probe → client
 *     calls `router.refresh()`.
 *   - `ready: false` when the upstream is unreachable or 404s →
 *     client polls again on the next tick.
 *
 * Each test resets the module registry so the dev/prod gate
 * (read at module top via `process.env.NODE_ENV`) is evaluated
 * with the right value per case.
 */
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@jpmorganchase/mosaic-site-middleware', () => ({
  // The route reads only `resolveMosaicMode()`; stubbing the whole
  // module keeps the middleware's fs/S3 imports out of this test's
  // graph and lets each case dictate the (mode, contentUrl) it wants
  // the route to see.
  resolveMosaicMode: vi.fn()
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// `@types/node` >= 22 (and TS 5+) types `process.env.NODE_ENV` as a
// readonly literal union, which makes direct assignment in tests a
// type error. The runtime is still mutable — the typing only models
// the production-side contract. This helper does the unsafe write
// once in a contained place rather than scattering casts through
// every `beforeEach`/`afterEach`/test body below.
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

async function loadRoute() {
  // Dynamic import after env mutation so the top-level
  // `process.env.NODE_ENV` checks evaluate against the case's value.
  vi.resetModules();
  return import('../route');
}

async function getResolveMode() {
  // Pull the mocked function instance from the same module ID the
  // route imports — `vi.mock` is hoisted so the import below
  // returns the mocked module.
  const middleware = await import('@jpmorganchase/mosaic-site-middleware');
  return middleware.resolveMosaicMode as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  // Reset fetch + env before each case so they don't bleed across
  // tests. Vitest's `vi.stubGlobal` would also work but a direct
  // assignment keeps the teardown obvious.
  vi.restoreAllMocks();
  setNodeEnv('development');
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe('/api/content/ready (production gate)', () => {
  it('returns 404 in production so the client poller stops', async () => {
    setNodeEnv('production');
    const { GET } = await loadRoute();

    const response = await GET();

    expect(response.status).toBe(404);
    // Production path is short-circuit only: the readiness probe
    // shouldn't run, so `resolveMosaicMode` should not be called.
    const resolveMosaicMode = await getResolveMode();
    expect(resolveMosaicMode).not.toHaveBeenCalled();
  });
});

describe('/api/content/ready (snapshot modes)', () => {
  it('reports ready immediately for snapshot-file without probing', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'snapshot-file', contentUrl: '' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ ready: true, mode: 'snapshot-file' });
    // The whole point of snapshot fast-path: no upstream probe.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports ready immediately for snapshot-s3 without probing', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'snapshot-s3', contentUrl: '' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ ready: true, mode: 'snapshot-s3' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('/api/content/ready (active mode)', () => {
  it('reports ready when MOSAIC_ACTIVE_MODE_URL is unset (nothing to wait for)', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: '' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    // Surface the reason so the poller can show a useful console
    // diagnostic if anyone inspects `/api/content/ready` directly.
    expect(body).toEqual({ ready: true, mode: 'active', reason: 'no-upstream-configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports ready when the upstream sitemap returns 200', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content.test' });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<urlset/>', { status: 200 }));

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ ready: true, mode: 'active', status: 200 });
    // The probe must hit the sitemap (the CLI's earliest "I'm
    // serving content" signal) and must opt out of Next's fetch
    // cache or a cold-start failure would be served back forever.
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://content.test/sitemap.xml',
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('reports not-ready when the upstream sitemap returns 404 (CLI up but no content)', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content.test' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not found', { status: 404 }));

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    // 404 from the upstream is the cold-start window: the Fastify
    // catch-all answers everything 404 until at least one source
    // worker has emitted. Client must keep polling.
    expect(body).toEqual({ ready: false, mode: 'active', status: 404 });
  });

  it('reports not-ready when fetch rejects (ECONNREFUSED)', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content.test' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      Object.assign(new Error('connect ECONNREFUSED'), { name: 'TypeError' })
    );

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    // Network error path: must not throw out of the route handler
    // (would render the global error page mid-poll); collapse to
    // `ready: false` so the poller schedules another tick.
    expect(body).toEqual({ ready: false, mode: 'active', reason: 'TypeError' });
  });

  it('reports not-ready when the probe times out (AbortError)', async () => {
    const resolveMosaicMode = await getResolveMode();
    resolveMosaicMode.mockReturnValue({ mode: 'active', contentUrl: 'http://content.test' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    );

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    // A wedged upstream is just another flavour of "not ready"; the
    // 2s `AbortController` cap inside the route makes sure we don't
    // hold the browser poll open indefinitely.
    expect(body).toEqual({ ready: false, mode: 'active', reason: 'AbortError' });
  });
});
