import { afterEach, describe, expect, test, vi } from 'vitest';
import checkLinks from 'check-links';

import BrokenLinksPlugin from '../BrokenLinksPlugin';

vi.mock('check-links', () => ({ default: vi.fn() }));

const checkLinksMock = vi.mocked(checkLinks);
const options = { baseUrl: 'http://localhost:8080' };
const $afterSource = BrokenLinksPlugin.$afterSource!;

function pageLinkingTo(index: number) {
  return {
    fullPath: `/docs/page-${index}.mdx`,
    route: `/docs/page-${index}`,
    content: `[link](https://example.com/${index})`
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  checkLinksMock.mockReset();
});

describe('GIVEN the BrokenLinksPlugin', () => {
  test('THEN it returns the pages without waiting for the link checks', async () => {
    checkLinksMock.mockReturnValue(new Promise(() => {}));
    const pages = [pageLinkingTo(1)];

    await expect($afterSource(pages, {} as never, options)).resolves.toBe(pages);
  });

  test('THEN a page that fails to parse or check is logged, not left as an unhandled rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    checkLinksMock.mockRejectedValue(new Error('network down'));

    await $afterSource(
      [{ fullPath: '/docs/broken.mdx', route: '/docs/broken', content: '<div' }, pageLinkingTo(1)],
      {} as never,
      options
    );

    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(2));
    expect(warn).toHaveBeenCalledWith(
      '[Mosaic][Plugin-BrokenLinks] Could not check the links in /docs/broken.mdx',
      expect.any(Error)
    );
    expect(warn).toHaveBeenCalledWith(
      '[Mosaic][Plugin-BrokenLinks] Could not check the links in /docs/page-1.mdx',
      expect.objectContaining({ message: 'network down' })
    );
  });

  test('THEN only a few pages are checked at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    checkLinksMock.mockImplementation(async links => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight -= 1;
      return Object.fromEntries(links.map(link => [link, { status: 'alive', statusCode: 200 }]));
    });

    await $afterSource(
      Array.from({ length: 12 }, (_, index) => pageLinkingTo(index)),
      {} as never,
      options
    );

    await vi.waitFor(() => expect(checkLinksMock).toHaveBeenCalledTimes(12));
    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  test('THEN it checks the content as it was when the source ran', async () => {
    checkLinksMock.mockResolvedValue({});
    const pages = Array.from({ length: 6 }, (_, index) => pageLinkingTo(index));

    await $afterSource(pages, {} as never, options);
    for (const page of pages) {
      page.content = '[changed](https://changed.example.com)';
    }

    await vi.waitFor(() => expect(checkLinksMock).toHaveBeenCalledTimes(6));
    const checkedLinks = checkLinksMock.mock.calls.flatMap(([links]) => links);
    expect(checkedLinks).not.toContain('https://changed.example.com/');
  });
});
