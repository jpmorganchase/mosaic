import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import type MosaicCore from '@jpmorganchase/mosaic-core';
import { afterEach, expect, test, vi } from 'vitest';

import { validateServeEnv } from '../env';
import { startRevalidateNotifier } from '../revalidateNotifier';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('the committed development configuration notifies the site after a source update', async () => {
  const env = {
    ...parseEnv(readFileSync(new URL('../../../site/.env', import.meta.url), 'utf8')),
    ...parseEnv(readFileSync(new URL('../../../site/.env.development', import.meta.url), 'utf8')),
    NODE_ENV: 'development'
  };
  const target = validateServeEnv(env).revalidate;
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const onSourceUpdate = vi.fn();
  const notifier = startRevalidateNotifier({ onSourceUpdate } as unknown as MosaicCore, target);

  try {
    expect(onSourceUpdate).toHaveBeenCalledOnce();
    const [sourceUpdated] = onSourceUpdate.mock.calls[0];
    sourceUpdated();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/revalidate', {
      signal: expect.any(AbortSignal),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mosaic-revalidate-secret': env.MOSAIC_REVALIDATE_SECRET
      }
    });
  } finally {
    notifier.stop();
  }
});
