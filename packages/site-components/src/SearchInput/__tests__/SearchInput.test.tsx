import { afterEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/docs/button'
}));

import { SearchInput } from '../index';
import { SearchProvider } from '../../SearchProvider';

const hit: SearchResult = {
  id: '/docs/button#usage',
  route: '/docs/button',
  href: '/docs/button#usage',
  anchor: 'usage',
  title: 'Button',
  headings: ['Usage'],
  namespace: 'docs',
  snippet: '<img src=x onerror=alert(1)> Button text',
  terms: ['Button'],
  group: '/docs/button',
  sections: [
    {
      id: '/docs/button#accessibility',
      route: '/docs/button',
      href: '/docs/button#accessibility',
      title: 'Button',
      headings: ['Accessibility'],
      namespace: 'docs',
      snippet: '',
      terms: []
    }
  ]
};

afterEach(() => vi.unstubAllGlobals());

describe('GIVEN a SearchInput', () => {
  test('THEN the input is labelled and does not fetch before a query', () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    expect(input.tagName).toBe('INPUT');
    expect(input).toBeEnabled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('THEN server results render text safely and navigate to matched sections', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [hit] }));
    vi.stubGlobal('fetch', fetcher);
    render(
      <SearchProvider namespace="docs">
        <SearchInput />
      </SearchProvider>
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'Button' }
    });
    expect(screen.getByRole('status')).toHaveTextContent('Searching');
    const section = await screen.findByRole('link', { name: 'Accessibility' });
    expect(section).toHaveAttribute('href', '/docs/button#accessibility');
    expect(screen.getByRole('link', { name: /Usage Button/ })).toHaveTextContent(hit.snippet);
    expect(document.querySelector('img')).toBeNull();
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe('/api/search');
    expect(url.searchParams.get('namespace')).toBe('docs');
    fireEvent.click(section);
    expect(push).toHaveBeenCalledWith('/docs/button#accessibility');
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
  });

  test('THEN a late response cannot replace newer results', async () => {
    let first: (response: Response) => void = () => {};
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            first = resolve;
          })
      )
      .mockResolvedValueOnce(Response.json({ results: [{ ...hit, title: 'New result' }] }));
    vi.stubGlobal('fetch', fetcher);
    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'old' } });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: 'new' } });
    await screen.findByText('New result');
    await act(async () => first(Response.json({ results: [{ ...hit, title: 'Old result' }] })));
    expect(screen.queryByText('Old result')).toBeNull();
    expect(screen.getByText('New result')).toBeInTheDocument();
  });

  test('THEN errors are distinct from empty results', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetcher);
    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'failed' } });
    await screen.findByText('Search is temporarily unavailable');
    fireEvent.change(input, { target: { value: 'empty' } });
    await screen.findByText('Nothing found');
  });

  test('THEN a static site searches records lazily in the browser', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        version: 1,
        records: [
          {
            id: '/docs/button#usage',
            route: '/docs/button',
            anchor: 'usage',
            title: 'Button',
            headings: ['Usage'],
            text: 'Press the button',
            namespace: 'docs'
          }
        ]
      })
    );
    vi.stubGlobal('fetch', fetcher);
    render(
      <SearchProvider mode="browser">
        <SearchInput />
      </SearchProvider>
    );
    expect(fetcher).not.toHaveBeenCalled();
    const input = screen.getByRole('textbox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'Press' } });
    await screen.findByRole('link', { name: /Button/ });
    fireEvent.change(input, { target: { value: 'button' } });
    await waitFor(() => expect(screen.queryByText('Searching…')).toBeNull());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/search-records.json');
  });

  test('THEN a host can disable search without a content store', () => {
    render(
      <SearchProvider enabled={false}>
        <SearchInput />
      </SearchProvider>
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
