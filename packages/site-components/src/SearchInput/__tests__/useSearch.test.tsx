import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SearchProvider } from '../../SearchProvider';
import { useSearch } from '../useSearch';

const pathname = vi.hoisted(() => ({ current: '/salt/components/button' as string | null }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

function searchedNamespace(url: string, namespace?: string) {
  pathname.current = url;
  const fetcher = vi.fn(async (_url: URL) => Response.json({ results: [] }));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useSearch('button'), {
    wrapper: ({ children }) => <SearchProvider namespace={namespace}>{children}</SearchProvider>
  });
  return waitFor(() => {
    expect(result.current.loading).toBe(false);
    return fetcher.mock.calls[0][0].searchParams.get('namespace');
  });
}

describe('useSearch', () => {
  test('prefers the namespace in the URL unless one is configured', async () => {
    expect(await searchedNamespace('/salt/components/button')).toBe('salt');
    expect(await searchedNamespace('/')).toBeNull();
    expect(await searchedNamespace('/salt/components/button', 'mosaic')).toBe('mosaic');
    vi.unstubAllGlobals();
  });
});
