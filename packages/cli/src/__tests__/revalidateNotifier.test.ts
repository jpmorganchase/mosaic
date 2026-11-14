import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type MosaicCore from '@jpmorganchase/mosaic-core';
import { startRevalidateNotifier } from '../revalidateNotifier';

let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  let update = () => {};
  const core = {
    onSourceUpdate: (callback: () => void) => {
      update = callback;
    }
  };
  stop = startRevalidateNotifier(core as unknown as MosaicCore, {
    url: 'http://site.test/api/revalidate',
    secret: 'test-token-placeholder'
  }).stop;
  return () => update();
}

test('retries a failed last update after recovery without another source event', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ ok: true });
  const update = setup(request);
  update();
  await vi.advanceTimersByTimeAsync(999);
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(2);
});

test('retries non-success responses with bounded backoff and coalesces updates', async () => {
  const request = vi.fn().mockResolvedValue({ ok: false, status: 503 });
  const update = setup(request);
  update();
  await vi.advanceTimersByTimeAsync(0);
  update();
  update();
  await vi.advanceTimersByTimeAsync(1000);
  expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(2000);
  expect(request).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(4000);
  expect(request).toHaveBeenCalledTimes(4);
  await vi.advanceTimersByTimeAsync(8000);
  await vi.advanceTimersByTimeAsync(16_000);
  expect(request).toHaveBeenCalledTimes(6);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(request).toHaveBeenCalledTimes(7);
  request.mockResolvedValue({ ok: true });
  await vi.advanceTimersByTimeAsync(29_999);
  expect(request).toHaveBeenCalledTimes(7);
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(8);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(8);
});

test('preserves an update received while the previous request is in flight', async () => {
  let complete!: (value: { ok: boolean }) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          complete = resolve;
        })
    )
    .mockResolvedValue({ ok: true });
  const update = setup(request);
  update();
  update();
  await vi.advanceTimersByTimeAsync(1000);
  expect(request).toHaveBeenCalledTimes(1);
  complete({ ok: true });
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1000);
  expect(request).toHaveBeenCalledTimes(2);
});

test('bounds a hanging request and retries even if it ignores cancellation', async () => {
  const request = vi
    .fn()
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValue({ ok: true });
  const update = setup(request);
  update();
  const signal = request.mock.calls[0][1].signal as AbortSignal;
  await vi.advanceTimersByTimeAsync(10_000);
  expect(signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(request).toHaveBeenCalledTimes(2);
});

test('shutdown aborts an active request and prevents timers or later updates', async () => {
  const request = vi.fn().mockImplementation(() => new Promise(() => {}));
  const update = setup(request);
  update();
  const signal = request.mock.calls[0][1].signal as AbortSignal;
  stop?.();
  update();
  expect(signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(request).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
