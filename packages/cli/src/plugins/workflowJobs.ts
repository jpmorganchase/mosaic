import { randomUUID } from 'node:crypto';

/**
 * In-memory store for workflow jobs started over HTTP and followed over
 * Server-Sent Events.
 *
 * Jobs only live in this process: they are lost when the CLI restarts,
 * and when several CLI instances sit behind a load balancer the events
 * request must reach the instance that started the job (sticky routing).
 */

export type WorkflowJobStatus = 'running' | 'success' | 'error';

export interface WorkflowJobEventData {
  status: string;
  message: unknown;
}

export interface WorkflowJobEvent {
  /** Sequence number, starting at 1. Sent as the SSE `id`. */
  id: number;
  event: 'progress' | 'done';
  data: WorkflowJobEventData;
}

type Listener = (event: WorkflowJobEvent) => void;

function formatDuration(ms: number) {
  if (ms % 60_000 === 0) return ms === 60_000 ? '1 minute' : `${ms / 60_000} minutes`;
  if (ms % 1000 === 0) return ms === 1000 ? '1 second' : `${ms / 1000} seconds`;
  return `${ms} ms`;
}

export interface WorkflowJobOptions {
  /** Most events kept per job; later progress events are dropped. */
  maxEvents: number;
  /** Fails the job when it hasn't finished after this long. `0` disables. */
  timeoutMs: number;
  now: () => number;
}

export class WorkflowJob {
  readonly id = randomUUID();
  readonly events: WorkflowJobEvent[] = [];
  status: WorkflowJobStatus = 'running';
  finishedAt: number | undefined;
  #listeners = new Set<Listener>();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #maxEvents: number;
  #now: () => number;

  constructor(readonly userId: string, { maxEvents, timeoutMs, now }: WorkflowJobOptions) {
    this.#maxEvents = Math.max(1, maxEvents);
    this.#now = now;
    if (timeoutMs > 0) {
      this.#timer = setTimeout(
        () => this.fail(`The workflow did not finish within ${formatDuration(timeoutMs)}.`),
        timeoutMs
      );
      this.#timer.unref?.();
    }
  }

  get done() {
    return this.status !== 'running';
  }

  progress(status: string, message: unknown) {
    if (this.done) return;
    // Keep the last slot for the `done` event.
    if (this.events.length >= this.#maxEvents - 1) return;
    this.#emit('progress', { status, message });
  }

  succeed(message: unknown) {
    this.#finish('success', { status: 'SUCCESS', message });
  }

  fail(message: unknown) {
    this.#finish('error', { status: 'ERROR', message });
  }

  /** Events after `lastEventId`, for a client that is (re)connecting. */
  eventsAfter(lastEventId: number) {
    return this.events.filter(event => event.id > lastEventId);
  }

  /** Calls `listener` for each new event; returns an unsubscribe function. */
  subscribe(listener: Listener) {
    if (this.done) return () => {};
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #finish(status: Exclude<WorkflowJobStatus, 'running'>, data: WorkflowJobEventData) {
    if (this.done) return;
    clearTimeout(this.#timer);
    this.status = status;
    this.finishedAt = this.#now();
    this.#emit('done', data);
    this.#listeners.clear();
  }

  #emit(event: WorkflowJobEvent['event'], data: WorkflowJobEventData) {
    const entry = { id: this.events.length + 1, event, data };
    this.events.push(entry);
    for (const listener of [...this.#listeners]) listener(entry);
  }
}

export interface WorkflowJobStoreOptions {
  /** Most jobs held at once. Default 100. */
  maxJobs?: number;
  /** Most events kept per job. Default 500. */
  maxEventsPerJob?: number;
  /** How long a finished job can still be replayed. Default 10 minutes. */
  retentionMs?: number;
  now?: () => number;
}

export class WorkflowJobStore {
  #jobs = new Map<string, WorkflowJob>();
  #maxJobs: number;
  #maxEventsPerJob: number;
  #retentionMs: number;
  #now: () => number;

  constructor({
    maxJobs = 100,
    maxEventsPerJob = 500,
    retentionMs = 10 * 60 * 1000,
    now = Date.now
  }: WorkflowJobStoreOptions = {}) {
    this.#maxJobs = maxJobs;
    this.#maxEventsPerJob = maxEventsPerJob;
    this.#retentionMs = retentionMs;
    this.#now = now;
  }

  get size() {
    return this.#jobs.size;
  }

  /**
   * Creates a job for `userId`, evicting the oldest finished jobs when the
   * store is full. Returns `undefined` when every slot holds a running job.
   */
  create(userId: string, timeoutMs: number): WorkflowJob | undefined {
    this.prune();
    for (const [id, job] of this.#jobs) {
      if (this.#jobs.size < this.#maxJobs) break;
      if (job.done) this.#jobs.delete(id);
    }
    if (this.#jobs.size >= this.#maxJobs) return undefined;
    const job = new WorkflowJob(userId, {
      maxEvents: this.#maxEventsPerJob,
      timeoutMs,
      now: this.#now
    });
    this.#jobs.set(job.id, job);
    return job;
  }

  get(id: string): WorkflowJob | undefined {
    this.prune();
    return this.#jobs.get(id);
  }

  /** Drops jobs that finished more than `retentionMs` ago. */
  prune() {
    const now = this.#now();
    for (const [id, job] of this.#jobs) {
      if (job.finishedAt !== undefined && now - job.finishedAt >= this.#retentionMs) {
        this.#jobs.delete(id);
      }
    }
  }
}

/** Formats one job event as an SSE message. */
export function formatSseEvent({ id, event, data }: WorkflowJobEvent) {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** The parts of `http.ServerResponse` the stream writer uses. */
export interface SseResponse {
  write(chunk: string): unknown;
  end(): unknown;
  on(event: 'close', listener: () => void): unknown;
  off(event: 'close', listener: () => void): unknown;
}

export interface StreamJobEventsOptions {
  /** Replay events after this id (from `Last-Event-ID`). Default 0. */
  lastEventId?: number;
  /** Interval between `: ping` comments. Default 15 seconds. */
  pingIntervalMs?: number;
}

/**
 * Writes `job`'s events to `res` as SSE: the events after `lastEventId`,
 * then new ones as they happen, ending the response after `done`. Sends a
 * `: ping` comment every `pingIntervalMs` so proxies don't close an idle
 * stream. Returns a function that stops streaming and ends the response;
 * timers and listeners are also released when the client disconnects.
 */
export function streamJobEvents(
  job: WorkflowJob,
  res: SseResponse,
  { lastEventId = 0, pingIntervalMs = 15_000 }: StreamJobEventsOptions = {}
): () => void {
  let closed = false;
  let unsubscribe = () => {};
  const ping = setInterval(() => {
    if (!closed) res.write(': ping\n\n');
  }, pingIntervalMs);
  ping.unref?.();

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    unsubscribe();
    res.off('close', cleanup);
  };
  const close = () => {
    if (closed) return;
    cleanup();
    res.end();
  };
  const write = (event: WorkflowJobEvent) => {
    if (closed) return;
    res.write(formatSseEvent(event));
    if (event.event === 'done') close();
  };

  res.on('close', cleanup);

  let replay = job.eventsAfter(lastEventId);
  // A client that already saw `done` still gets a terminal event, so it
  // doesn't keep reconnecting to a finished job.
  if (job.done && replay.length === 0) replay = job.events.slice(-1);
  for (const event of replay) write(event);
  if (closed) return close;

  unsubscribe = job.subscribe(write);
  return close;
}
