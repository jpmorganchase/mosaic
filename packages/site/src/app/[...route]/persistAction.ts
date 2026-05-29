'use server';

/**
 * Server Action that creates a Pull Request for the edited page.
 *
 * Opens a WebSocket to the workflows backend (server-side, using
 * Node 22+'s native `WebSocket`) and streams progress events back to
 * the editor as an async generator. Replaces the previous
 * `useWorkflowFeed` client-side WebSocket; `MOSAIC_WORKFLOWS_URL` is
 * now server-only (was `NEXT_PUBLIC_*`).
 *
 * Auth: required and checked inside the action — Server Actions are
 * public endpoints and `page.tsx`'s auth gate doesn't apply when the
 * action is invoked directly.
 *
 * Serverless caveat: one open socket per save. In platforms with a
 * per-request runtime cap, saves that exceed it are cut short.
 */
import { createHash } from 'node:crypto';
import { auth } from '../../auth';
import type { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

export interface PersistInput {
  /** Route the edited content lives at, e.g. `/foo/bar`. */
  route: string;
  /** New markdown content (gray-matter front-matter included). */
  markdown: string;
}

export type PersistEvent =
  | { kind: 'progress'; message: SourceWorkflowMessageEvent }
  | { kind: 'complete'; prHref: string | null }
  | { kind: 'error'; message: string };

const WORKFLOWS_URL = process.env.MOSAIC_WORKFLOWS_URL ?? '';

export async function* persistContent(
  input: PersistInput
): AsyncGenerator<PersistEvent, void, unknown> {
  // Cheap synchronous guard first — skip the auth() call (which is
  // request-scoped but still does work) if the workflow URL isn't
  // even configured.
  if (!WORKFLOWS_URL) {
    yield { kind: 'error', message: 'MOSAIC_WORKFLOWS_URL is not configured.' };
    return;
  }

  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.email) {
    yield { kind: 'error', message: 'Not authenticated.' };
    return;
  }

  // Prefer a domain-specific `sid` when the host has wired one into
  // the session callback; fall back to email so a default Auth.js
  // setup still produces a stable channel key.
  const sid = (sessionUser as { sid?: string }).sid ?? sessionUser.email;
  const channel = createHash('md5').update(`${sid.toLowerCase()} - save`).digest('hex');

  let socket: WebSocket;
  try {
    socket = new WebSocket(WORKFLOWS_URL);
  } catch (e) {
    yield {
      kind: 'error',
      message: e instanceof Error ? e.message : 'Failed to open workflows connection.'
    };
    return;
  }

  // Bridge the event-emitter shape of `WebSocket` onto a promise
  // queue so the consumer can `for await` over it. Pending events
  // are buffered until pulled; a pending pull resolves immediately
  // if a buffered event is already waiting.
  const queue: PersistEvent[] = [];
  let pending: ((event: PersistEvent | null) => void) | null = null;
  let done = false;

  const push = (event: PersistEvent) => {
    if (pending) {
      const fn = pending;
      pending = null;
      fn(event);
    } else {
      queue.push(event);
    }
  };

  const finish = () => {
    if (done) return;
    done = true;
    if (pending) {
      const fn = pending;
      pending = null;
      fn(null);
    }
    try {
      socket.close();
    } catch {
      /* already closed */
    }
  };

  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({
        user: { sid, name: sessionUser.name ?? '', email: sessionUser.email },
        route: input.route,
        markdown: input.markdown,
        name: 'save',
        channel
      })
    );
  });

  socket.addEventListener('message', (msg: MessageEvent) => {
    let parsed: SourceWorkflowMessageEvent;
    try {
      parsed = JSON.parse(typeof msg.data === 'string' ? msg.data : String(msg.data));
    } catch (e) {
      push({
        kind: 'error',
        message: e instanceof Error ? `Malformed workflow message: ${e.message}` : String(e)
      });
      finish();
      return;
    }
    if (parsed.channel && parsed.channel !== channel) return; // not ours
    if (parsed.status === 'ERROR') {
      push({
        kind: 'error',
        message:
          typeof parsed.message === 'string'
            ? parsed.message
            : 'Workflow reported an unspecified error.'
      });
      finish();
    } else if (parsed.status === 'COMPLETE') {
      const prHref =
        (parsed.message as { links?: { self?: { href?: string }[] } } | undefined)?.links?.self?.[0]
          ?.href ?? null;
      push({ kind: 'complete', prHref });
      finish();
    } else {
      push({ kind: 'progress', message: parsed });
    }
  });

  socket.addEventListener('error', () => {
    push({ kind: 'error', message: 'Workflows websocket error.' });
    finish();
  });
  socket.addEventListener('close', () => finish());

  // Consumer loop — yield events as they arrive, exit when finish()
  // signals end-of-stream.
  while (!done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift() as PersistEvent;
      continue;
    }
    const next = await new Promise<PersistEvent | null>(resolve => {
      pending = resolve;
    });
    if (next === null) return;
    yield next;
  }
}


