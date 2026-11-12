'use server';

/**
 * Server Action that starts the save workflow for the edited page.
 *
 * It asks the Mosaic CLI to start the workflow (`POST
 * <MOSAIC_WORKFLOWS_URL>/workflows/jobs`) and returns the job id; the
 * editor then follows the job's progress through
 * `/api/workflows/<jobId>/events` (Server-Sent Events), which proxies the
 * CLI's event stream. Plain HTTP and SSE, so saves work where WebSockets
 * aren't allowed, and a dropped progress stream reconnects and replays
 * what it missed.
 *
 * Auth: required and checked inside the action — Server Actions are
 * public endpoints and `page.tsx`'s auth gate doesn't apply when the
 * action is invoked directly. The user must also be an authorised
 * editor (`MOSAIC_EDITORS`), and every route is validated before it is
 * forwarded. The CLI authenticates us with `MOSAIC_WORKFLOWS_SECRET`.
 */
import { checkEditor, getWorkflowsBaseUrl, getWorkflowsSecret } from '../../../lib/workflows';
import { isSafeRoute } from '../../../lib/routes';
import { workflowDefaultsSchema } from '@jpmorganchase/mosaic-schemas';
import {
  validateCommitMessage,
  normalizeCommitMessage
} from '@jpmorganchase/mosaic-schemas/commitMessage';
import type {
  EditorSaveInput,
  WorkflowDefaults,
  WorkflowDefaultsInput
} from '@jpmorganchase/mosaic-types';

export type PersistInput = EditorSaveInput;

export type StartSaveResult = { jobId: string } | { error: string };

/** How long to wait for the CLI to accept the job (not for the save itself). */
const START_TIMEOUT_MS = 30_000;

const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;
const MAX_FRONTMATTER_BYTES = 256 * 1024;

function validateDefaultsInput(input: WorkflowDefaultsInput): string | null {
  if (!input || typeof input !== 'object') return 'Invalid save request.';
  if (!isSafeRoute(input.route)) return 'Invalid page route.';
  if (input.targetRoute !== undefined && !isSafeRoute(input.targetRoute)) {
    return 'Invalid target route.';
  }
  if (input.isNewPage !== undefined && typeof input.isNewPage !== 'boolean')
    return 'Invalid save request.';
  return null;
}

/** Resolve source defaults without allocating a save job. Authorization applies to this action too. */
export async function getSaveDefaults(
  input: WorkflowDefaultsInput
): Promise<WorkflowDefaults | { error: string }> {
  const baseUrl = getWorkflowsBaseUrl();
  const secret = getWorkflowsSecret();
  if (!baseUrl || !secret)
    return { error: 'MOSAIC_WORKFLOWS_URL and MOSAIC_WORKFLOWS_SECRET must both be configured.' };
  const editor = await checkEditor();
  if (!editor.ok) return { error: editor.error };
  const invalid = validateDefaultsInput(input);
  if (invalid) return { error: invalid };
  try {
    const response = await fetch(`${baseUrl}/workflows/defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        name: 'save',
        user: editor.user,
        route: input.route,
        ...(input.targetRoute !== undefined ? { targetRoute: input.targetRoute } : {}),
        ...(input.isNewPage ? { isNewPage: true } : {})
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(START_TIMEOUT_MS)
    });
    const parsed = workflowDefaultsSchema.safeParse(await response.json());
    if (response.ok && parsed.success) return parsed.data;
  } catch {
    // Defaults errors must not leak provider/source configuration to the browser.
  }
  return { error: 'Could not load the commit message. Try again.' };
}

/** Returns an error message for an invalid payload, `null` when it's fine. */
function validateInput(input: PersistInput): string | null {
  const routeError = validateDefaultsInput(input);
  if (routeError) return routeError;
  if (input.commitMessage !== undefined) {
    const messageError = validateCommitMessage(input.commitMessage);
    if (messageError) return messageError;
  }
  if (
    typeof input.markdown !== 'string' ||
    Buffer.byteLength(input.markdown, 'utf8') > MAX_MARKDOWN_BYTES
  ) {
    return 'Invalid page content.';
  }
  if (
    input.frontmatter !== undefined &&
    (typeof input.frontmatter !== 'string' ||
      Buffer.byteLength(input.frontmatter, 'utf8') > MAX_FRONTMATTER_BYTES)
  ) {
    return 'Invalid frontmatter.';
  }
  return null;
}

export async function startSave(input: PersistInput): Promise<StartSaveResult> {
  const baseUrl = getWorkflowsBaseUrl();
  const secret = getWorkflowsSecret();
  if (!baseUrl || !secret) {
    return { error: 'MOSAIC_WORKFLOWS_URL and MOSAIC_WORKFLOWS_SECRET must both be configured.' };
  }

  const editor = await checkEditor();
  if (!editor.ok) return { error: editor.error };

  const invalid = validateInput(input);
  if (invalid) return { error: invalid };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/workflows/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify({
        name: 'save',
        user: editor.user,
        route: input.route,
        markdown: input.markdown,
        ...(input.commitMessage !== undefined
          ? { commitMessage: normalizeCommitMessage(input.commitMessage) }
          : {}),
        // Only include the key when the editor actually sent
        // frontmatter — workflows that haven't opted in branch on
        // `typeof frontmatter === 'string'`.
        ...(typeof input.frontmatter === 'string' ? { frontmatter: input.frontmatter } : {}),
        ...(typeof input.targetRoute === 'string' && input.targetRoute !== input.route
          ? { targetRoute: input.targetRoute }
          : {}),
        // Never send `false`: absent === edit, present === create.
        ...(input.isNewPage ? { isNewPage: true } : {})
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(START_TIMEOUT_MS)
    });
  } catch (e) {
    console.error('[mosaic-site] Could not reach the workflows backend', e);
    return { error: 'Could not reach the workflows backend.' };
  }

  const body = (await response.json().catch(() => null)) as {
    jobId?: unknown;
    error?: unknown;
  } | null;
  if (response.status === 202 && typeof body?.jobId === 'string') return { jobId: body.jobId };
  return {
    error:
      typeof body?.error === 'string' && body.error
        ? body.error
        : `The workflows backend responded with ${response.status}.`
  };
}
