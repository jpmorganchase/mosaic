import { afterEach, describe, expect, test, vi } from 'vitest';
import { createSearchClient } from '../searchClient';

afterEach(() => vi.unstubAllGlobals());

const records = {
  version: 1,
  records: [
    {
      id: '/docs/a#details',
      route: '/docs/a',
      anchor: 'details',
      title: 'Button',
      headings: ['Details'],
      text: 'Activate the button',
      namespace: 'docs'
    }
  ]
};

describe('records search client', () => {
  test('excludes non-site navigation targets supplied by a custom endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          results: [
            { href: 'javascript:alert(1)' },
            { href: '//outside.test' },
            { href: '/\\outside.test' },
            {
              href: '/docs/a#details',
              sections: [{ href: 'https://outside.test' }, { href: '/docs/a#other' }]
            }
          ]
        })
      )
    );
    expect(await createSearchClient()('button')).toEqual([
      { href: '/docs/a#details', sections: [{ href: '/docs/a#other' }] }
    ]);
  });

  test('does no work for an empty query', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(await createSearchClient({ mode: 'browser' })('  ')).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('deduplicates concurrent index loads and keeps them alive across query cancellation', async () => {
    let resolve: (value: Response) => void = () => {};
    const fetcher = vi.fn(
      () =>
        new Promise<Response>(done => {
          resolve = done;
        })
    );
    vi.stubGlobal('fetch', fetcher);
    const search = createSearchClient({ mode: 'browser', recordsUrl: '/content/records.json' });
    const controller = new AbortController();
    const first = search('button', 'docs', controller.signal);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = search('activate');
    controller.abort();
    resolve(Response.json(records));
    await rejected;
    expect(await second).toMatchObject([{ href: '/docs/a#details' }]);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/content/records.json');
  });

  test('retries a failed or malformed browser index on the next search', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ version: 2, records: [] }))
      .mockResolvedValueOnce(Response.json(records));
    vi.stubGlobal('fetch', fetcher);
    const search = createSearchClient({ mode: 'browser' });
    await expect(search('button')).rejects.toThrow('Invalid search records');
    expect(await search('button')).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test('passes cancellation and encoded queries to a configurable API endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    await createSearchClient({ endpoint: '/custom/search?scope=docs' })(
      'a & b',
      'salt',
      controller.signal
    );
    const [url, options] = fetcher.mock.calls[0];
    expect(url.pathname).toBe('/custom/search');
    expect(url.searchParams.get('scope')).toBe('docs');
    expect(url.searchParams.get('q')).toBe('a & b');
    expect(url.searchParams.get('namespace')).toBe('salt');
    expect(options.signal).toBe(controller.signal);
  });
});
