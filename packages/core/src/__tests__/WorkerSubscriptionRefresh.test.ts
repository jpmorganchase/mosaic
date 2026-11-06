import { Subject, type Observable } from 'rxjs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import WorkerSubscription, { EVENT } from '../WorkerSubscription';
import from from '../operators/ObservableWorker.js';

vi.mock('../operators/ObservableWorker.js', () => ({ default: vi.fn() }));

describe('GIVEN WorkerSubscription', () => {
  let fromWorker$: Subject<unknown>;
  let toWorker: unknown[];
  let subscription: WorkerSubscription;

  beforeEach(() => {
    fromWorker$ = new Subject();
    toWorker = [];
    vi.mocked(from).mockImplementation((_workerData, toWorker$?: Observable<unknown>) => {
      toWorker$?.subscribe(message => toWorker.push(message));
      return fromWorker$ as never;
    });
    subscription = new WorkerSubscription({ modulePath: 'module', options: {}, plugins: [] });
  });

  describe('WHEN the source is refreshed', () => {
    test('THEN a refresh message is posted to the worker', () => {
      void subscription.refresh();
      void subscription.refresh();
      expect(toWorker).toEqual([
        { type: 'refresh', id: 1 },
        { type: 'refresh', id: 2 }
      ]);
    });

    test("THEN each refresh settles with the worker's reply to it", async () => {
      const first = subscription.refresh();
      const second = subscription.refresh();
      const third = subscription.refresh();

      fromWorker$.next({ type: 'refresh', data: { id: 2, refreshed: false } });
      fromWorker$.next({ type: 'refresh', data: { id: 1, refreshed: true } });
      fromWorker$.next({ type: 'refresh', data: { id: 3, error: 'git fetch failed' } });

      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(false);
      await expect(third).rejects.toThrow('git fetch failed');
    });

    test('THEN refresh replies are not treated as page updates or errors', () => {
      const updateSpy = vi.fn();
      const errorSpy = vi.fn();
      subscription.on(EVENT.UPDATE, updateSpy);
      subscription.on(EVENT.ERROR, errorSpy);

      void subscription.refresh();
      fromWorker$.next({ type: 'refresh', data: { id: 1, refreshed: true } });
      fromWorker$.next({ type: 'refresh', data: { id: 99, refreshed: true } });

      expect(updateSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(subscription.closed).toBe(false);
    });

    test('THEN a pending refresh is rejected when the worker stops', async () => {
      const pending = subscription.refresh();
      subscription.stop();
      await expect(pending).rejects.toThrow('Source stopped before it was refreshed');
    });

    test('THEN a stopped worker cannot be refreshed', async () => {
      subscription.stop();
      await expect(subscription.refresh()).rejects.toThrow('subscription is closed');
      expect(toWorker).toEqual([]);
    });
  });
});
