import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  WorkflowJob,
  WorkflowJobStore,
  formatSseEvent,
  streamJobEvents
} from '../plugins/workflowJobs';

class FakeResponse extends EventEmitter {
  chunks: string[] = [];
  ended = false;
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.ended = true;
  }
  get body() {
    return this.chunks.join('');
  }
}

const options = { maxEvents: 500, timeoutMs: 0, now: Date.now };

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkflowJob', () => {
  test('numbers events from 1 and stops recording after done', () => {
    const job = new WorkflowJob('user', options);
    job.progress('IN_PROGRESS', 'one');
    job.succeed('finished');
    job.progress('IN_PROGRESS', 'late');
    job.fail('late failure');

    expect(job.status).toEqual('success');
    expect(job.events).toEqual([
      { id: 1, event: 'progress', data: { status: 'IN_PROGRESS', message: 'one' } },
      { id: 2, event: 'done', data: { status: 'SUCCESS', message: 'finished' } }
    ]);
  });

  test('keeps at most maxEvents events, always including done', () => {
    const job = new WorkflowJob('user', { ...options, maxEvents: 3 });
    for (let i = 0; i < 10; i += 1) job.progress('IN_PROGRESS', `step ${i}`);
    job.fail('boom');

    expect(job.events.map(event => event.data.message)).toEqual(['step 0', 'step 1', 'boom']);
  });

  test('fails when it does not finish in time', () => {
    vi.useFakeTimers();
    const job = new WorkflowJob('user', { ...options, timeoutMs: 5 * 60 * 1000 });
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(job.status).toEqual('error');
    expect(job.events.at(-1)?.data).toEqual({
      status: 'ERROR',
      message: 'The workflow did not finish within 5 minutes.'
    });
  });

  test('clears its timeout when it finishes', () => {
    vi.useFakeTimers();
    const job = new WorkflowJob('user', { ...options, timeoutMs: 1000 });
    job.succeed('done');
    expect(vi.getTimerCount()).toEqual(0);
  });
});

describe('WorkflowJobStore', () => {
  test('keeps finished jobs for the retention period', () => {
    let now = 0;
    const store = new WorkflowJobStore({ retentionMs: 1000, now: () => now });
    const running = store.create('user', 0) as WorkflowJob;
    const finished = store.create('user', 0) as WorkflowJob;
    finished.succeed('done');

    now = 999;
    expect(store.get(finished.id)).toBe(finished);
    now = 1000;
    expect(store.get(finished.id)).toBeUndefined();
    expect(store.get(running.id)).toBe(running);
  });

  test('evicts the oldest finished jobs when full and refuses when every job is running', () => {
    const store = new WorkflowJobStore({ maxJobs: 2 });
    const first = store.create('user', 0) as WorkflowJob;
    const second = store.create('user', 0) as WorkflowJob;
    first.succeed('done');

    const third = store.create('user', 0) as WorkflowJob;
    expect(store.get(first.id)).toBeUndefined();
    expect(store.get(second.id)).toBe(second);
    expect(store.get(third.id)).toBe(third);

    expect(store.create('user', 0)).toBeUndefined();
    expect(store.size).toEqual(2);
  });
});

describe('streamJobEvents', () => {
  test('replays past events, streams new ones and ends after done', () => {
    const job = new WorkflowJob('user', options);
    job.progress('IN_PROGRESS', 'one');
    const res = new FakeResponse();

    streamJobEvents(job, res);
    expect(res.body).toEqual(formatSseEvent(job.events[0]));
    expect(res.ended).toBe(false);

    job.progress('IN_PROGRESS', 'two');
    job.succeed({ ok: true });
    expect(res.body).toEqual(
      'id: 1\nevent: progress\ndata: {"status":"IN_PROGRESS","message":"one"}\n\n' +
        'id: 2\nevent: progress\ndata: {"status":"IN_PROGRESS","message":"two"}\n\n' +
        'id: 3\nevent: done\ndata: {"status":"SUCCESS","message":{"ok":true}}\n\n'
    );
    expect(res.ended).toBe(true);
    expect(res.listenerCount('close')).toEqual(0);
  });

  test('only replays events after lastEventId', () => {
    const job = new WorkflowJob('user', options);
    job.progress('IN_PROGRESS', 'one');
    job.progress('IN_PROGRESS', 'two');
    const res = new FakeResponse();

    streamJobEvents(job, res, { lastEventId: 1 });
    expect(res.body).toEqual(formatSseEvent(job.events[1]));
  });

  test('sends a ping comment while the job runs', () => {
    vi.useFakeTimers();
    const job = new WorkflowJob('user', options);
    const res = new FakeResponse();

    streamJobEvents(job, res, { pingIntervalMs: 15_000 });
    vi.advanceTimersByTime(30_000);
    expect(res.chunks).toEqual([': ping\n\n', ': ping\n\n']);

    job.succeed('done');
    vi.advanceTimersByTime(30_000);
    expect(res.chunks.filter(chunk => chunk.startsWith(':'))).toHaveLength(2);
    expect(vi.getTimerCount()).toEqual(0);
  });

  test('releases its timer and listener when the client disconnects', () => {
    vi.useFakeTimers();
    const job = new WorkflowJob('user', options);
    const res = new FakeResponse();

    streamJobEvents(job, res);
    res.emit('close');
    job.progress('IN_PROGRESS', 'after disconnect');
    vi.advanceTimersByTime(60_000);

    expect(res.chunks).toEqual([]);
    expect(vi.getTimerCount()).toEqual(0);
    expect(res.listenerCount('close')).toEqual(0);
  });

  test('returns a function that ends the stream', () => {
    const job = new WorkflowJob('user', options);
    const res = new FakeResponse();

    const close = streamJobEvents(job, res);
    close();
    job.progress('IN_PROGRESS', 'after close');

    expect(res.ended).toBe(true);
    expect(res.chunks).toEqual([]);
  });
});
