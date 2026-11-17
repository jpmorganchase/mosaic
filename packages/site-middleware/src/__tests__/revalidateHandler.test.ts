import { expect, test, vi } from 'vitest';
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
import { createRevalidateHandler } from '../revalidateHandler.js';

const request = (token?: string) =>
  new Request('http://localhost/revalidate', {
    method: 'POST',
    headers: token ? { 'x-mosaic-revalidate-secret': token } : {}
  });

test('fails closed and does not invalidate or notify unauthorized requests', async () => {
  const invalidate = vi.fn();
  const notify = vi.fn();
  const getSecret = vi.fn((): { secret?: string } => ({}));
  const handler = createRevalidateHandler({ getSecret, invalidate, notify });
  expect((await handler(request())).status).toBe(503);
  // Generated test-only value; no configured environment credentials are read.
  const token = crypto.randomUUID();
  getSecret.mockReturnValue({ secret: token });
  expect((await handler(request('invalid'))).status).toBe(401);
  expect((await handler(request('x'.repeat(token.length)))).status).toBe(401);
  expect(invalidate).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

test('awaits successful immediate invalidation before notifying, and never notifies on failure', async () => {
  const token = crypto.randomUUID();
  const order: string[] = [];
  const invalidate = vi.fn(async () => {
    await Promise.resolve();
    order.push('invalidate');
  });
  const notify = vi.fn(() => {
    order.push('notify');
  });
  const handler = createRevalidateHandler({
    getSecret: () => ({ secret: token }),
    invalidate,
    notify
  });
  expect((await handler(request(token))).status).toBe(200);
  expect(invalidate).toHaveBeenCalledWith('mosaic-content', { expire: 0 });
  expect(order).toEqual(['invalidate', 'notify']);
  notify.mockClear();
  invalidate.mockRejectedValueOnce(new Error('cache unavailable'));
  await expect(handler(request(token))).rejects.toThrow('cache unavailable');
  expect(notify).not.toHaveBeenCalled();
});
