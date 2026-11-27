import type { SourceWorkflowMessageEvent } from '@jpmorganchase/mosaic-types';

import type { PersistEvent } from './components/PersistEditDialog';

/** The parts of `EventSource` used here; lets tests pass a fake. */
interface EventSourceLike {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

type EventSourceConstructor = new (url: string) => EventSourceLike;

export interface SubscribeToSaveOptions {
  /**
   * URL of the save's event stream. Defaults to the reference site's
   * route, `/api/workflows/<jobId>/events`.
   */
  url?: string;
  /**
   * How many times to retry before a connection successfully opens.
   * `EventSource` reconnects automatically and resumes from the last event.
   * Default 3.
   */
  maxReconnects?: number;
  /**
   * Maximum time to wait for a save result, including reconnections.
   * Defaults to 6 minutes, one minute longer than the standard CLI workflow timeout.
   * Hosts with a longer workflow timeout can provide a larger value.
   */
  maxWaitMs?: number;
  /** `EventSource` implementation. Defaults to the browser's. */
  EventSource?: EventSourceConstructor;
}

const CLOSED = 2;
const DEFAULT_MAX_WAIT_MS = 6 * 60 * 1000;
const MAX_TIMER_MS = 2_147_483_647;

export const LOST_CONNECTION_MESSAGE =
  'Lost connection to the save. It may still finish: check for a new pull request before trying again.';

interface DoneData {
  status?: unknown;
  message?: unknown;
}

function parse(data: string): DoneData | null {
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as DoneData) : null;
  } catch {
    return null;
  }
}

/** Reads the shared completion shape and responses from older workflow hosts. */
function prHrefOf(message: unknown): string | null {
  const result = message as
    | { pullRequestUrl?: unknown; links?: { self?: { href?: unknown }[] } }
    | null
    | undefined;
  const href =
    typeof message === 'string'
      ? message
      : result?.pullRequestUrl ?? result?.links?.self?.[0]?.href;
  if (typeof href !== 'string') return null;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? href : null;
  } catch {
    return null;
  }
}

/**
 * Follows a save started on the server (e.g. by the reference site's
 * `startSave` Server Action, which returns the job id) over Server-Sent
 * Events, as the events `PersistDialog` consumes:
 *
 * - each `progress` event becomes `{ kind: 'progress' }`;
 * - the final `done` event becomes `{ kind: 'complete', prHref }` or
 *   `{ kind: 'error', message }`, after which the stream is closed;
 * - if the connection is refused, exhausts the reconnect budget, or
 *   fails to deliver a result within `maxWaitMs`, an error ends the iteration.
 *
 * Stopping the iteration early closes the `EventSource`.
 */
export function subscribeToSave(
  jobId: string,
  {
    url = `/api/workflows/${encodeURIComponent(jobId)}/events`,
    maxReconnects = 3,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    EventSource: EventSourceImpl = (globalThis as { EventSource?: EventSourceConstructor })
      .EventSource
  }: SubscribeToSaveOptions = {}
): AsyncGenerator<PersistEvent, void, unknown> {
  const controller = new AbortController();
  const deadline =
    Number.isFinite(maxWaitMs) && maxWaitMs > 0
      ? Math.min(maxWaitMs, MAX_TIMER_MS)
      : DEFAULT_MAX_WAIT_MS;
  const stream = followSaveEvents(url, maxReconnects, deadline, EventSourceImpl, controller.signal);
  const finish = stream.return.bind(stream);
  const fail = stream.throw.bind(stream);
  // A generator's return and throw wait for any pending next() to settle.
  // Wake that reader and close the connection before queuing either operation.
  stream.return = value => {
    controller.abort();
    return finish(value);
  };
  stream.throw = error => {
    controller.abort();
    return fail(error);
  };
  return stream;
}

async function* followSaveEvents(
  url: string,
  maxReconnects: number,
  maxWaitMs: number,
  EventSourceImpl: EventSourceConstructor | undefined,
  signal: AbortSignal
): AsyncGenerator<PersistEvent, void, unknown> {
  if (!EventSourceImpl) {
    yield { kind: 'error', message: 'This browser cannot follow the progress of a save.' };
    return;
  }

  const source = new EventSourceImpl(url);
  const queue: PersistEvent[] = [];
  let finished = false;
  let failures = 0;
  let wake: (() => void) | null = null;

  const close = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    source.close();
  };

  const abort = () => {
    queue.length = 0;
    close();
    wake?.();
    wake = null;
  };

  const push = (event: PersistEvent, last = false) => {
    if (finished) return;
    queue.push(event);
    if (last) close();
    wake?.();
    wake = null;
  };

  const timer = setTimeout(() => {
    push({ kind: 'error', message: LOST_CONNECTION_MESSAGE }, true);
  }, maxWaitMs);
  source.addEventListener('open', () => {
    failures = 0;
  });
  source.addEventListener('progress', event => {
    const data = parse(event.data);
    if (!data || typeof data.status !== 'string') return;
    push({ kind: 'progress', message: data as SourceWorkflowMessageEvent });
  });
  source.addEventListener('done', event => {
    const data = parse(event.data);
    if (data?.status === 'SUCCESS') {
      push({ kind: 'complete', prHref: prHrefOf(data.message) }, true);
    } else {
      push(
        {
          kind: 'error',
          message:
            typeof data?.message === 'string' && data.message
              ? data.message
              : 'Workflow reported an unspecified error.'
        },
        true
      );
    }
  });
  source.addEventListener('error', () => {
    if (finished) return;
    failures += 1;
    // CLOSED: the server refused the stream (not signed in, unknown job,
    // backend down), so EventSource won't retry.
    if (source.readyState === CLOSED || failures > maxReconnects) {
      push({ kind: 'error', message: LOST_CONNECTION_MESSAGE }, true);
    }
  });

  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      const next = queue.shift();
      if (next) {
        yield next;
      } else if (finished) {
        return;
      } else {
        await new Promise<void>(resolve => {
          wake = resolve;
        });
      }
    }
  } finally {
    signal.removeEventListener('abort', abort);
    abort();
  }
}
