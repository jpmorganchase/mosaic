import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthoringSiteProvider, toAuthoringSite, useAuthoringSite } from '../authoringSite';

describe('toAuthoringSite', () => {
  it('builds URLs for pages on the authoring site', () => {
    const site = toAuthoringSite('https://dev.example.com/');
    expect(site).toMatchObject({ url: 'https://dev.example.com', host: 'dev.example.com' });
    expect(site?.href('/docs/page?edit=1')).toBe('https://dev.example.com/docs/page?edit=1');
    expect(site?.href('docs/page')).toBe('https://dev.example.com/docs/page');
  });

  it('keeps a base path and a port, and drops any query or hash', () => {
    const site = toAuthoringSite('http://localhost:3000/site/?x=1#top');
    expect(site).toMatchObject({ url: 'http://localhost:3000/site', host: 'localhost:3000' });
    expect(site?.href('/docs')).toBe('http://localhost:3000/site/docs');
  });

  it.each([
    undefined,
    '',
    '/relative',
    'dev.example.com',
    'ftp://dev.example.com',
    'javascript:alert(1)'
  ])('ignores %j', url => {
    expect(toAuthoringSite(url)).toBeUndefined();
  });
});

describe('useAuthoringSite', () => {
  const withUrl =
    (url: string | undefined) =>
    ({ children }: { children: ReactNode }) =>
      <AuthoringSiteProvider url={url}>{children}</AuthoringSiteProvider>;

  it('is undefined without a provider, so pages are edited here', () => {
    expect(renderHook(() => useAuthoringSite()).result.current).toBeUndefined();
  });

  it('is undefined when the provider has no valid URL', () => {
    expect(
      renderHook(() => useAuthoringSite(), { wrapper: withUrl('not a url') }).result.current
    ).toBeUndefined();
  });

  it('returns the authoring site from the provider', () => {
    const { result } = renderHook(() => useAuthoringSite(), {
      wrapper: withUrl('https://dev.example.com')
    });
    expect(result.current?.href('/a')).toBe('https://dev.example.com/a');
  });
});
