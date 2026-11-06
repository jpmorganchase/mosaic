/**
 * Tests for `/api/workflows/[jobId]/events`, which proxies a save's
 * progress stream from the Mosaic CLI to a signed-in editor.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();
const isAuthorizedEditorMock = vi.fn();
vi.mock('../../../../../../auth', () => ({
  auth: authMock,
  isAuthorizedEditor: isAuthorizedEditorMock
}));

const fetchMock = vi.fn();
const encoder = new TextEncoder();
const SSE = 'id: 1\nevent: done\ndata: {"status":"SUCCESS","message":"ok"}\n\n';

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

function upstreamStream(chunks: string[], { end = true } = {}) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (end) controller.close();
    }
  });
}

function sse(body: ReadableStream<Uint8Array>) {
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

function callRoute(
  jobId = 'job-1',
  { headers = {}, signal }: { headers?: Record<string, string>; signal?: AbortSignal } = {}
) {
  return loadRoute().then(({ GET }) =>
    GET(new Request(`http://site.test/api/workflows/${jobId}/events`, { headers, signal }), {
      params: Promise.resolve({ jobId })
    })
  );
}

function upstreamRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
  return { url: String(url), headers: init.headers as Record<string, string>, init };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('MOSAIC_WORKFLOWS_URL', 'http://cli.test:8080');
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'workflows-secret');
  authMock.mockResolvedValue({ user: { name: 'Dev User', email: 'dev@mosaic.local' } });
  isAuthorizedEditorMock.mockReturnValue(true);
  fetchMock.mockResolvedValue(sse(upstreamStream([SSE])));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('GET /api/workflows/[jobId]/events', () => {
  it("streams the CLI's events for the signed-in editor", async () => {
    const response = await callRoute('job-1', { headers: { 'Last-Event-ID': '4' } });

    expect(response.status).toEqual(200);
    expect(response.headers.get('content-type')).toEqual('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toEqual('no-cache, no-transform');
    expect(response.headers.get('x-accel-buffering')).toEqual('no');
    expect(await response.text()).toEqual(SSE);

    const request = upstreamRequest();
    expect(request.url).toEqual(
      'http://cli.test:8080/workflows/jobs/job-1/events?user=dev%40mosaic.local'
    );
    expect(request.headers).toEqual({
      Accept: 'text/event-stream',
      Authorization: 'Bearer workflows-secret',
      'Last-Event-ID': '4'
    });
  });

  it("uses the session's sid when the host provides one", async () => {
    authMock.mockResolvedValue({ user: { email: 'dev@mosaic.local', sid: 'D123' } });
    await (await callRoute()).text();
    expect(upstreamRequest().url).toMatch(/\?user=D123$/);
  });

  it('ignores a malformed Last-Event-ID', async () => {
    await (await callRoute('job-1', { headers: { 'Last-Event-ID': 'x' } })).text();
    expect(upstreamRequest().headers).not.toHaveProperty('Last-Event-ID');
  });

  it('aborts the upstream request when the browser disconnects', async () => {
    fetchMock.mockResolvedValue(sse(upstreamStream([SSE], { end: false })));
    const browser = new AbortController();
    const response = await callRoute('job-1', { signal: browser.signal });
    const upstreamSignal = upstreamRequest().init.signal as AbortSignal;
    expect(upstreamSignal.aborted).toBe(false);

    browser.abort();
    expect(upstreamSignal.aborted).toBe(true);
    await response.body?.cancel();
  });

  it('aborts the upstream request when the response stream is cancelled', async () => {
    fetchMock.mockResolvedValue(sse(upstreamStream([SSE], { end: false })));
    const response = await callRoute();
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    await reader.read();

    await reader.cancel();
    expect((upstreamRequest().init.signal as AbortSignal).aborted).toBe(true);
  });

  it('refuses visitors who are not signed in or not editors', async () => {
    authMock.mockResolvedValue(null);
    const anonymous = await callRoute();
    expect(anonymous.status).toEqual(401);

    authMock.mockResolvedValue({ user: { email: 'dev@mosaic.local' } });
    isAuthorizedEditorMock.mockReturnValue(false);
    const notEditor = await callRoute();
    expect(notEditor.status).toEqual(403);
    expect(await notEditor.json()).toEqual({ error: 'You are not allowed to edit this site.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when the workflows backend is not configured', async () => {
    vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', '');
    const response = await callRoute();
    expect(response.status).toEqual(503);
    expect(authMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a malformed job id without contacting the CLI', async () => {
    const response = await callRoute('..%2F..%2Fadmin');
    expect(response.status).toEqual(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the CLI does not know the job', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'Workflow job not found' }, { status: 404 })
    );
    const response = await callRoute();
    expect(response.status).toEqual(404);
    expect(await response.json()).toEqual({ error: 'Save not found.' });
  });

  it('returns 502 when the CLI fails or cannot be reached', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'Unauthorized.' }, { status: 401 }));
    expect((await callRoute()).status).toEqual(502);

    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const unreachable = await callRoute();
    expect(unreachable.status).toEqual(502);
    expect(await unreachable.json()).toEqual({ error: 'Could not reach the workflows backend.' });
  });
});
