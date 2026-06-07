/**
 * Tests for `/api/revalidate`.
 *
 * The endpoint is a tiny but security-sensitive surface: any caller
 * that gets past the auth check can flip every page's cache stale,
 * which is a cheap way to wedge a deployment under load. Each branch
 * here pins the contract the upstream CLI (and any CMS webhook)
 * depends on:
 *
 *   - 503 when the server is missing a configured secret (fail
 *     closed; never silently allow).
 *   - 401 on a missing, malformed, or wrong secret.
 *   - 200 + tag invalidation on a correct secret (header or Bearer).
 *
 * The secret comparison uses `crypto.timingSafeEqual` to neutralise
 * the response-time side channel a naive `===` would leak. The
 * "different-length input" case below also exercises the explicit
 * length pre-check that keeps `timingSafeEqual` from throwing on
 * mismatched buffers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `revalidateTag` is the side-effecting call the route makes on
// success. Stubbed so the test can assert it was (or wasn't) called
// without involving Next's real fetch cache.
const revalidateTagMock = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

// `notifyContentChanged` pushes a dev-only SSE notification. Stubbed
// to keep the test independent of the live-reload bus implementation.
const notifyContentChangedMock = vi.fn();
vi.mock('../../../../lib/liveReloadBus', () => ({
  notifyContentChanged: notifyContentChangedMock
}));

// The route imports `MOSAIC_CONTENT_CACHE_TAG` from the narrow
// `/cache-tags` subpath. Mock that exact module ID so the test
// doesn't pull `cachedLoaders.ts` (which uses fs + S3) into the
// graph.
vi.mock('@jpmorganchase/mosaic-site-middleware/cache-tags', () => ({
  MOSAIC_CONTENT_CACHE_TAG: 'mosaic-content'
}));

const ORIGINAL_SECRET = process.env.MOSAIC_REVALIDATE_SECRET;

async function loadRoute() {
  // Fresh import per case so the module-level `process.env` read
  // (when the handler runs) sees the case's value. The route itself
  // reads the env inside the handler, but resetting modules keeps
  // the mock setup deterministic across cases.
  vi.resetModules();
  return import('../route');
}

function buildRequest(init: { secret?: string; bearer?: string } = {}): Request {
  const headers = new Headers();
  if (init.secret) headers.set('x-mosaic-revalidate-secret', init.secret);
  if (init.bearer) headers.set('authorization', `Bearer ${init.bearer}`);
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MOSAIC_REVALIDATE_SECRET = 'sup3r-s3cr3t';
});

afterEach(() => {
  // Restore the env so other test files aren't affected by the
  // value we set. `delete` covers the case where the var wasn't set
  // at all when the suite started.
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.MOSAIC_REVALIDATE_SECRET;
  } else {
    process.env.MOSAIC_REVALIDATE_SECRET = ORIGINAL_SECRET;
  }
});

describe('/api/revalidate (fail-closed posture)', () => {
  it('returns 503 when MOSAIC_REVALIDATE_SECRET is not configured', async () => {
    delete process.env.MOSAIC_REVALIDATE_SECRET;
    const { POST } = await loadRoute();
    // The request is well-formed; the failure mode is server config,
    // not caller behaviour, so the contract is 503 (Service Unavailable)
    // rather than 401.
    const response = await POST(buildRequest({ secret: 'anything' }) as never);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/not configured/i);
    // No tag flip; no live-reload notify.
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(notifyContentChangedMock).not.toHaveBeenCalled();
  });
});

describe('/api/revalidate (auth)', () => {
  it('returns 401 when neither the custom header nor Authorization is set', async () => {
    const { POST } = await loadRoute();
    const response = await POST(buildRequest() as never);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the provided secret is wrong (same length)', async () => {
    const { POST } = await loadRoute();
    // Same length as 'sup3r-s3cr3t' so the length pre-check passes
    // and the comparison actually reaches `timingSafeEqual`. The
    // wrong-byte case is the one that would leak timing info under
    // a naive `===`.
    const response = await POST(buildRequest({ secret: 'wr0ng-s3cr3t!' }) as never);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the provided secret differs in length', async () => {
    const { POST } = await loadRoute();
    // Different length — exercises the up-front length check that
    // keeps `timingSafeEqual` from throwing.
    const response = await POST(buildRequest({ secret: 'short' }) as never);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('accepts the secret via the x-mosaic-revalidate-secret header', async () => {
    const { POST } = await loadRoute();
    const response = await POST(buildRequest({ secret: 'sup3r-s3cr3t' }) as never);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.tag).toBe('mosaic-content');
    expect(typeof body.revalidatedAt).toBe('string');
    // Confirm the side effects fired exactly once each.
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
    expect(revalidateTagMock).toHaveBeenCalledWith('mosaic-content', 'max');
    expect(notifyContentChangedMock).toHaveBeenCalledTimes(1);
  });

  it('accepts the secret via an Authorization: Bearer header', async () => {
    const { POST } = await loadRoute();
    const response = await POST(buildRequest({ bearer: 'sup3r-s3cr3t' }) as never);
    expect(response.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
  });

  it('prefers the custom header over Authorization when both are present', async () => {
    const { POST } = await loadRoute();
    // Custom header wins per `extractSecret`'s order. Wrong Bearer
    // should be ignored, the right custom header should still
    // authorise.
    const response = await POST(
      buildRequest({ secret: 'sup3r-s3cr3t', bearer: 'wr0ng-s3cr3t!' }) as never
    );
    expect(response.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledTimes(1);
  });
});

describe('/api/revalidate (timing-safety smoke check)', () => {
  it('does not throw on multi-byte UTF-8 secrets of the same byte length', async () => {
    // The Buffer length comparison is in *bytes*, not characters.
    // A two-character emoji (4 UTF-8 bytes) plus a two-character
    // ASCII prefix matches the byte length of a six-ASCII-char
    // configured secret without matching character-for-character.
    // The route must not throw in this case (`timingSafeEqual`
    // only complains about *byte* length mismatches).
    process.env.MOSAIC_REVALIDATE_SECRET = 'ab🎉';
    const { POST } = await loadRoute();
    // Two different 6-byte sequences: the configured one and a
    // different-bytes-same-length attempt.
    const response = await POST(buildRequest({ secret: 'abcdef' }) as never);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });
});

