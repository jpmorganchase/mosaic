import { afterEach, expect, test, vi } from 'vitest';
import { createLiveReloadHandler } from '../liveReloadHandler.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const request = (signal?: AbortSignal) => new Request('http://localhost/live', { signal });
const decoder = new TextDecoder();

test('does not subscribe in production', async () => {
  const subscribe = vi.fn();
  const handler = createLiveReloadHandler({ isDevelopment: () => false, subscribe });
  expect((await handler(request())).status).toBe(404);
  expect(subscribe).not.toHaveBeenCalled();
});

test.each(['abort', 'cancel'])(
  'sends events and keepalives, then cleans up once on %s',
  async kind => {
    vi.useFakeTimers();
    const stop = vi.fn();
    let changed!: () => void;
    const abort = new AbortController();
    const remove = vi.spyOn(abort.signal, 'removeEventListener');
    const handler = createLiveReloadHandler({
      isDevelopment: () => true,
      subscribe: callback => {
        changed = callback;
        return stop;
      },
      keepaliveIntervalMs: 20
    });
    // Use the signal directly so teardown can be observed without Request's signal proxy.
    const response = await handler({ signal: abort.signal } as Request);
    const reader = response.body!.getReader();
    expect(decoder.decode((await reader.read()).value)).toContain('connected');
    changed();
    expect(decoder.decode((await reader.read()).value)).toContain('event: content-changed');
    await vi.advanceTimersByTimeAsync(20);
    expect(decoder.decode((await reader.read()).value)).toContain('keepalive');
    if (kind === 'abort') abort.abort();
    else await reader.cancel();
    abort.abort();
    await reader.cancel();
    expect(stop).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    changed();
  }
);

test('an already aborted request has an empty closed body and no subscription', async () => {
  const subscribe = vi.fn();
  const response = await createLiveReloadHandler({ isDevelopment: () => true, subscribe })(
    request(AbortSignal.abort())
  );
  expect(await response.text()).toBe('');
  expect(subscribe).not.toHaveBeenCalled();
});

test('a synchronous abort during subscription still releases that subscription', async () => {
  vi.useFakeTimers();
  const abort = new AbortController();
  const stop = vi.fn();
  const response = await createLiveReloadHandler({
    isDevelopment: () => true,
    subscribe: () => {
      abort.abort();
      return stop;
    }
  })(request(abort.signal));
  await response.text();
  expect(stop).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

test('an enqueue failure tears down the timer and listener without waiting for cancel', async () => {
  vi.useFakeTimers();
  const stop = vi.fn();
  let changed!: () => void;
  const response = await createLiveReloadHandler({
    isDevelopment: () => true,
    subscribe: cb => {
      changed = cb;
      return stop;
    }
  })(request());
  const enqueue = vi
    .spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
    .mockImplementation(() => {
      throw new Error('closed');
    });
  changed();
  changed();
  expect(stop).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  enqueue.mockRestore();
  await response.body!.cancel();
});
