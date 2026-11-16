import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SearchProvider } from '../../SearchProvider';
import { useSearch } from '../useSearch';

const pathname = vi.hoisted(() => ({ current: '/salt/components/button' as string | null }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

afterEach(() => vi.unstubAllGlobals());

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
  });

  test('refreshes the current query when ranking or grouping changes while reusing the index', async () => {
    const records = ['usage', 'examples'].map(tab => ({
      id: `/salt/button/${tab}`,
      route: `/salt/button/${tab}`,
      title: 'Button',
      text: 'Button content',
      headings: [],
      namespace: 'salt'
    }));
    const fetcher = vi.fn(async () => Response.json({ version: 1, records }));
    vi.stubGlobal('fetch', fetcher);
    let preferred = '/usage';
    let grouped = true;
    const { result, rerender } = renderHook(() => useSearch('button'), {
      wrapper: ({ children }) => {
        const suffix = preferred;
        const combine = grouped;
        return (
          <SearchProvider
            mode="browser"
            indexOptions={{
              groupBy: record => (combine ? 'button' : record.route),
              pageRank: record => (record.route.endsWith(suffix) ? 0 : 1)
            }}
          >
            {children}
          </SearchProvider>
        );
      }
    });
    await waitFor(() => expect(result.current.results[0]?.href).toBe('/salt/button/usage'));
    expect(result.current.results).toHaveLength(1);
    preferred = '/examples';
    rerender();
    // Hide the old response immediately while the new policy is being queried.
    expect(result.current.results).toEqual([]);
    await waitFor(() => expect(result.current.results[0]?.href).toBe('/salt/button/examples'));
    grouped = false;
    rerender();
    await waitFor(() => expect(result.current.results).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
