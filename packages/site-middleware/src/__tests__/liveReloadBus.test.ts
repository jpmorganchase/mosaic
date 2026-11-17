import { expect, test, vi } from 'vitest';

test('keeps local subscriptions across module reevaluation and supports idempotent unsubscribe', async () => {
  const first = await import('../liveReloadBus.js');
  const changed = vi.fn();
  const stop = first.subscribeContentChanged(changed);
  vi.resetModules();
  const second = await import('../liveReloadBus.js');
  second.notifyContentChanged();
  expect(changed).toHaveBeenCalledOnce();
  stop();
  stop();
  second.notifyContentChanged();
  expect(changed).toHaveBeenCalledOnce();
});
