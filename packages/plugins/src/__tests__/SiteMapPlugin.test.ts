import { JSDOM } from 'jsdom';
import { Volume } from 'memfs';
import { describe, expect, test, vi } from 'vitest';
import FileAccess from '../../../core/src/filesystems/FileAccess';
import MutableVolume from '../../../core/src/filesystems/MutableVolume';
import SiteMapPlugin from '../SiteMapPlugin';

describe('SiteMapPlugin', () => {
  test('excludes internal data only from the sitemap while preserving shared ignore rules', async () => {
    const filesystem = new MutableVolume(
      new FileAccess(
        Volume.fromJSON({
          '/salt/index.mdx': '# Salt',
          '/salt/components/button.mdx': '# Button',
          '/salt/shared-config.json': '{}',
          '/salt-github/core-1.74.0.json': '{"title":"Core release"}'
        })
      ),
      'salt'
    );
    const setData = vi.fn();
    const beforeSend = SiteMapPlugin.$beforeSend!;

    await beforeSend(
      filesystem,
      {
        config: { setData },
        ignorePages: ['shared-config.json']
      } as unknown as Parameters<typeof beforeSend>[1],
      { siteUrl: 'https://www.saltdesignsystem.com/', exclude: ['**/salt-github/**'] }
    );

    expect(setData).toHaveBeenCalledWith({
      sitemaps: [['/salt/index.mdx', '/salt/components/button.mdx']]
    });
    expect(String(await filesystem.promises.readFile('/salt-github/core-1.74.0.json'))).toBe(
      '{"title":"Core release"}'
    );
  });

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
