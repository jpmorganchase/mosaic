/**
 * Server-only helpers shared by the save Server Action
 * (`app/[namespace]/[[...route]]/persistAction.ts`) and the save-progress route
 * (`app/api/workflows/[jobId]/events/route.ts`).
 *
 * Saves run on the Mosaic CLI: the action starts a job with
 * `POST <MOSAIC_WORKFLOWS_URL>/workflows/jobs` and the route proxies
 * `GET <MOSAIC_WORKFLOWS_URL>/workflows/jobs/:id/events` (Server-Sent
 * Events) to the browser. Both authenticate to the CLI with
 * `MOSAIC_WORKFLOWS_SECRET` as a bearer token.
 */
import { auth, isAuthorizedEditor } from '../auth';
import { getSiteConfig } from './config';

let warnedAboutWebSocketUrl = false;

/**
 * The CLI's HTTP base URL from `MOSAIC_WORKFLOWS_URL`, without a trailing
 * slash, or `undefined` when it isn't set.
 *
 * A trailing `/workflows` (the old endpoint path) is dropped. Saves used to
 * run over a WebSocket, so a `ws://` / `wss://` URL is still accepted: it is
 * converted to `http://` / `https://`, with a one-time deprecation warning.
 */
export function getWorkflowsBaseUrl(): string | undefined {
  const configured = getSiteConfig().workflows.url.trim();
  if (!configured) return undefined;
  let url = configured.replace(/\/workflows\/?$/, '');
  if (/^wss?:\/\//i.test(url)) {
    url = url.replace(/^ws/i, 'http');
    if (!warnedAboutWebSocketUrl) {
      warnedAboutWebSocketUrl = true;
      console.warn(
        `[mosaic-site] MOSAIC_WORKFLOWS_URL=${configured} is a WebSocket URL. Saves now use ` +
          `HTTP and Server-Sent Events: set it to the CLI's base URL (${url}).`
      );
    }
  }
  return url.replace(/\/+$/, '');
}

export function getWorkflowsSecret(): string | undefined {
  return getSiteConfig().workflows.secret || undefined;
}

export interface WorkflowUser {
  /** Identifies the user's jobs on the CLI. */
  sid: string;
  name: string;
  email: string;
}

export type EditorCheck =
  | { ok: true; user: WorkflowUser }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Checks that the caller is signed in and allowed to edit
 * (`MOSAIC_EDITORS`). Server Actions and route handlers are public
 * endpoints, so each one checks for itself.
 */
export async function checkEditor(): Promise<EditorCheck> {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.email) return { ok: false, status: 401, error: 'Not authenticated.' };
  if (!isAuthorizedEditor(sessionUser)) {
    return { ok: false, status: 403, error: 'You are not allowed to edit this site.' };
  }
  return {
    ok: true,
    user: {
      // Prefer a domain-specific `sid` when the host has wired one into
      // the session callback; fall back to email.
      sid: (sessionUser as { sid?: string }).sid ?? sessionUser.email,
      name: sessionUser.name ?? '',
      email: sessionUser.email
    }
  };
}

/** Response headers for a Server-Sent Events stream. */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  // `no-transform` stops compression (Next's included) buffering events.
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no'
} as const;
