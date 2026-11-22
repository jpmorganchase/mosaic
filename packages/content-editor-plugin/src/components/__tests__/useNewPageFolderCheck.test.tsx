import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import {
  NEW_PAGE_CHECK_DELAY_MS,
  NEW_PAGE_CHECK_ENDPOINT,
  useNewPageFolderCheck
} from '../useNewPageFolderCheck';

const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const render = (folder: string | undefined, enabled = true) =>
  renderHook(({ folder, enabled }) => useNewPageFolderCheck(folder, enabled), {
    initialProps: { folder, enabled }
  });

/** Runs the debounce and lets the fetch settle. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(NEW_PAGE_CHECK_DELAY_MS);
  });

describe('useNewPageFolderCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('asks the site about the folder once it stops changing', async () => {
    fetchMock.mockImplementation(() => answer({ folder: '/docs', writable: true }));
    const { result } = render('/docs');
    expect(result.current).toBe('checking');
    expect(fetchMock).not.toHaveBeenCalled();

    await settle();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`${NEW_PAGE_CHECK_ENDPOINT}?folder=%2Fdocs`);
    expect(result.current).toBe('writable');
  });

  it('reports a folder new pages cannot be added to', async () => {
    fetchMock.mockImplementation(() => answer({ folder: '/test', writable: false }));
    const { result } = render('/test');
    await settle();
    expect(result.current).toBe('read-only');
  });

  it('only checks the last folder typed, and never shows an older answer for it', async () => {
    fetchMock.mockImplementation((url: string) =>
      answer({ writable: url.endsWith(encodeURIComponent('/docs')) })
    );
    const { result, rerender } = render('/do');
    rerender({ folder: '/doc', enabled: true });
    rerender({ folder: '/docs', enabled: true });
    expect(result.current).toBe('checking');

    await settle();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.current).toBe('writable');
    rerender({ folder: '/other', enabled: true });
    expect(result.current).toBe('checking');
  });

  it('remembers answers, so returning to a folder is instant', async () => {
    fetchMock.mockImplementation(() => answer({ writable: true }));
    const { result, rerender } = render('/docs');
    await settle();
    rerender({ folder: '/other', enabled: true });
    await settle();
    rerender({ folder: '/docs', enabled: true });

    expect(result.current).toBe('writable');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['the site has no check route', () => answer({}, 404)],
    ['the check fails', () => answer({ error: 'content-unavailable' }, 503)],
    ['the answer is malformed', () => answer({ writable: 'yes' })],
    ['the request fails', () => Promise.reject(new TypeError('offline'))]
  ])('is unknown when %s', async (_, respond) => {
    fetchMock.mockImplementation(respond);
    const { result } = render('/docs');
    await settle();
    expect(result.current).toBe('unknown');
  });

  it('does nothing while disabled or without a folder', async () => {
    expect(render('/docs', false).result.current).toBeUndefined();
    expect(render(undefined).result.current).toBeUndefined();
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
