import { describe, expect, test } from 'vitest';

import { LOST_CONNECTION_MESSAGE, subscribeToSave } from '../subscribeToSave';
import type { PersistEvent } from '../components/PersistEditDialog';

type Listener = (event: MessageEvent<string>) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readyState = 0;
  closed = false;
  listeners = new Map<string, Listener[]>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  emit(type: string, data?: unknown) {
    const event = { data: data === undefined ? '' : JSON.stringify(data) } as MessageEvent<string>;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  /** A dropped connection that EventSource will retry. */
  drop() {
    this.readyState = 0;
    this.emit('error');
  }

  /** A refused connection (non-200 response): EventSource gives up. */
  refuse() {
    this.readyState = 2;
    this.emit('error');
  }
}

function subscribe(jobId = 'job-1', maxReconnects?: number) {
  FakeEventSource.instances = [];
  const stream = subscribeToSave(jobId, { EventSource: FakeEventSource, maxReconnects });
  const events: PersistEvent[] = [];
  const done = (async () => {
    for await (const event of stream) events.push(event);
  })();
  // The generator opens the EventSource on its first `next()`.
  const source = () => FakeEventSource.instances[0];
  return { events, done, source };
}

const tick = () => new Promise(resolve => setTimeout(resolve));

describe('subscribeToSave', () => {
  test('closes the stream when iteration stops while waiting for an event', async () => {
    FakeEventSource.instances = [];
    const stream = subscribeToSave('job-1', { EventSource: FakeEventSource });
    const pending = stream.next();
    const source = FakeEventSource.instances[0];
    expect(source.closed).toBe(false);

    const stopped = stream.return();

    expect(source.closed).toBe(true);
    await expect(pending).resolves.toEqual({ done: true, value: undefined });
    await expect(stopped).resolves.toEqual({ done: true, value: undefined });
  });

  test('maps progress and a successful done event, then closes the stream', async () => {
    const { events, done, source } = subscribe('job/1');
    await tick();
    expect(source().url).toEqual('/api/workflows/job%2F1/events');

    source().open();
    source().emit('progress', { status: 'IN_PROGRESS', message: 'Saved page' });
    source().emit('done', {
      status: 'SUCCESS',
      message: { links: { self: [{ href: 'https://example.test/pr/1' }] } }
    });
    await done;

    expect(events).toEqual([
      { kind: 'progress', message: { status: 'IN_PROGRESS', message: 'Saved page' } },
      { kind: 'complete', prHref: 'https://example.test/pr/1' }
    ]);
    expect(source().closed).toBe(true);
  });

  test('reports a done event without a pull request link as complete', async () => {
    const { events, done, source } = subscribe();
    await tick();
    source().emit('done', { status: 'SUCCESS', message: 'Workflow save finished' });
    await done;
    expect(events).toEqual([{ kind: 'complete', prHref: null }]);
  });

  test.each([
    ['the shared completion shape', { pullRequestUrl: 'https://github.com/example/docs/pull/1' }],
    ['an older GitHub workflow', 'https://github.com/example/docs/pull/1']
  ])('reads a pull request link from %s', async (_description, message) => {
    const { events, done, source } = subscribe();
    await tick();
    source().emit('done', { status: 'SUCCESS', message });
    await done;

    expect(events).toEqual([
      { kind: 'complete', prHref: 'https://github.com/example/docs/pull/1' }
    ]);
  });

  test.each(['Workflow save finished', 'javascript:alert(1)', '/not-an-absolute-url'])(
    'does not treat %s as a pull request URL',
    async message => {
      const { events, done, source } = subscribe();
      await tick();
      source().emit('done', { status: 'SUCCESS', message });
      await done;
      expect(events).toEqual([{ kind: 'complete', prHref: null }]);
    }
  );

  test('maps a failed done event to an error', async () => {
    const { events, done, source } = subscribe();
    await tick();
    source().emit('done', { status: 'ERROR', message: 'Workflow save not found' });
    await done;
    expect(events).toEqual([{ kind: 'error', message: 'Workflow save not found' }]);
    expect(source().closed).toBe(true);
  });

  test('lets EventSource reconnect a few times before giving up', async () => {
    const { events, done, source } = subscribe('job-1', 2);
    await tick();
    source().open();
    source().drop();
    source().open();
    source().drop();
    source().drop();
    await tick();
    expect(events).toEqual([]);
    expect(source().closed).toBe(false);

    source().drop();
    await done;
    expect(events).toEqual([{ kind: 'error', message: LOST_CONNECTION_MESSAGE }]);
    expect(source().closed).toBe(true);
  });

  test('gives up straight away when the server refuses the stream', async () => {
    const { events, done, source } = subscribe();
    await tick();
    source().refuse();
    await done;
    expect(events).toEqual([{ kind: 'error', message: LOST_CONNECTION_MESSAGE }]);
  });

  test('closes the EventSource when the consumer stops early', async () => {
    FakeEventSource.instances = [];
    const stream = subscribeToSave('job-1', { EventSource: FakeEventSource });
    const first = stream.next();
    await tick();
    const [source] = FakeEventSource.instances;
    source.emit('progress', { status: 'IN_PROGRESS', message: 'one' });
    await first;
    await stream.return(undefined);
    expect(source.closed).toBe(true);
  });

  test('reports an error when EventSource is unavailable', async () => {
    const events: PersistEvent[] = [];
    for await (const event of subscribeToSave('job-1', {
      EventSource: undefined as never
    })) {
      events.push(event);
    }
    expect(events).toEqual([
      { kind: 'error', message: 'This browser cannot follow the progress of a save.' }
    ]);
  });
});
