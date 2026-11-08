import { JSDOM } from 'jsdom';
import { describe, expect, test, vi } from 'vitest';
import SiteMapPlugin from '../SiteMapPlugin';

describe('SiteMapPlugin', () => {
  test('merges multiple sources, including empty sources, without text between URL elements', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const afterUpdate = SiteMapPlugin.afterUpdate!;

    await afterUpdate(
      {} as Parameters<typeof afterUpdate>[0],
      {
        sharedFilesystem: { promises: { writeFile } },
        globalConfig: {
          data: {
            sitemaps: [['/salt/components/button.mdx'], ['/salt/getting-started/index.mdx'], []]
          }
        }
      } as unknown as Parameters<typeof afterUpdate>[1],
      { siteUrl: 'https://www.saltdesignsystem.com/' }
    );

    expect(writeFile).toHaveBeenCalledOnce();
    const [filename, xml] = writeFile.mock.calls[0];
    expect(filename).toBe('/sitemap.xml');

    const dom = new JSDOM(xml, { contentType: 'application/xml' });
    const root = dom.window.document.documentElement;
    expect(root.localName).toBe('urlset');
    expect([...root.children].map(element => element.localName)).toEqual(['url', 'url']);
    expect([...root.querySelectorAll('loc')].map(element => element.textContent)).toEqual([
      'https://www.saltdesignsystem.com/salt/components/button',
      'https://www.saltdesignsystem.com/salt/getting-started/index'
    ]);
    // Sitemap urlsets contain elements and whitespace only. Array interpolation
    // previously inserted commas between sources, even when a source was empty.
    expect(
      [...root.childNodes]
        .filter(node => node.nodeType === dom.window.Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('')
        .trim()
    ).toBe('');
    dom.window.close();
  });
});
