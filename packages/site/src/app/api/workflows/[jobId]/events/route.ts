/**
 * Save progress as Server-Sent Events.
 *
 * The editor opens an `EventSource` here with the job id returned by the
 * `startSave` Server Action. This route checks that the caller is a
 * signed-in editor, then proxies the Mosaic CLI's
 * `GET /workflows/jobs/:id/events` stream for that user, forwarding
 * `Last-Event-ID` so a reconnecting `EventSource` only gets the events it
 * missed. The upstream request is aborted when the browser disconnects.
 *
 * Stream: `progress` events, then one `done` event with
 * `{ status: 'SUCCESS' | 'ERROR', message }`, after which it ends.
 */
import {
  SSE_HEADERS,
  checkEditor,
  getWorkflowsBaseUrl,
  getWorkflowsSecret
} from '../../../../../lib/workflows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JOB_ID = /^[A-Za-z0-9-]{1,128}$/;

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const baseUrl = getWorkflowsBaseUrl();
  const secret = getWorkflowsSecret();
  if (!baseUrl || !secret) {
    return jsonError(
      503,
      'MOSAIC_WORKFLOWS_URL and MOSAIC_WORKFLOWS_SECRET must both be configured.'
    );
  }

  const editor = await checkEditor();
  if (!editor.ok) return jsonError(editor.status, editor.error);

  const { jobId } = await params;
  if (!JOB_ID.test(jobId)) return jsonError(404, 'Save not found.');

  const upstreamUrl = new URL(`${baseUrl}/workflows/jobs/${jobId}/events`);
  upstreamUrl.searchParams.set('user', editor.user.sid);
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${secret}`
  };
  const lastEventId = request.headers.get('last-event-id');
  if (lastEventId && /^\d{1,9}$/.test(lastEventId)) headers['Last-Event-ID'] = lastEventId;

  const upstreamAbort = new AbortController();
  const abortUpstream = () => upstreamAbort.abort();
  const stopListening = () => request.signal.removeEventListener('abort', abortUpstream);
  if (request.signal.aborted) abortUpstream();
  else request.signal.addEventListener('abort', abortUpstream, { once: true });

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers,
      cache: 'no-store',
      signal: upstreamAbort.signal
    });
  } catch (e) {
    stopListening();
    if (!upstreamAbort.signal.aborted) {
      console.error('[mosaic-site] Could not reach the workflows backend', e);
    }
    return jsonError(502, 'Could not reach the workflows backend.');
  }

  if (!upstream.ok || !upstream.body) {
    stopListening();
    upstreamAbort.abort();
    // 404: unknown job, someone else's job, or the CLI restarted and lost it.
    return upstream.status === 404
      ? jsonError(404, 'Save not found.')
      : jsonError(502, `The workflows backend responded with ${upstream.status}.`);
  }

  const reader = upstream.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const end = () => {
        stopListening();
        try {
          controller.close();
        } catch {
          // Already cancelled by the browser.
        }
      };
      try {
        const { done, value } = await reader.read();
        if (done) end();
        else controller.enqueue(value);
      } catch {
        // The CLI dropped the stream, or the browser went away. End ours
        // too; a browser that is still there reconnects with Last-Event-ID.
        end();
      }
    },
    cancel(reason) {
      stopListening();
      upstreamAbort.abort();
      return reader.cancel(reason).catch(() => {});
    }
  });

  return new Response(body, { headers: SSE_HEADERS });
}
