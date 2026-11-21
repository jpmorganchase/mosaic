import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Volume } from 'memfs';
import { afterAll, describe, expect, test, vi } from 'vitest';
import FileAccess from '../../../core/src/filesystems/FileAccess';
import MutableVolume from '../../../core/src/filesystems/MutableVolume';
import mdxSerialiser from '../../../serialisers/src/mdx';
import LlmsTxtPlugin, {
  LLMS_FULL_TXT_FILE,
  LLMS_TXT_FILE,
  MARKDOWN_PAGES_FILE,
  buildLlmsTxt
} from '../LlmsTxtPlugin';
import { toMarkdown } from '../utils/toMarkdown';

const lines = (...content: string[]) => content.join('\n');

describe('GIVEN toMarkdown', () => {
  const page = { route: '/docs/button/usage', title: 'Button', data: { status: 'Stable' } };

  test('THEN it keeps Markdown and resolves meta expressions', async () => {
    const markdown = await toMarkdown({
      ...page,
      content: lines(
        '# {meta.title}',
        '',
        'Status: {meta.data.status}. {1 + 1}',
        '',
        '| Prop | Type |',
        '| ---- | ---- |',
        '| size | `string` |',
        '',
        '```js',
        'const a = {meta.title};',
        '```'
      )
    });
    expect(markdown).toBe(
      lines(
        '# Button',
        '',
        'Status: Stable.',
        '',
        '| Prop | Type     |',
        '| ---- | -------- |',
        '| size | `string` |',
        '',
        '```js',
        'const a = {meta.title};',
        '```'
      )
    );
  });

  test('THEN it leaves out imports, exports and expressions that are not meta', async () => {
    const markdown = await toMarkdown({
      ...page,
      content: lines("import { X } from './x';", 'export const y = 1;', '', '{y}', '', 'Text.')
    });
    expect(markdown).toBe('Text.');
  });

  test('THEN it replaces components with their children, and Callouts with quotes', async () => {
    const markdown = await toMarkdown({
      ...page,
      content: lines(
        '<Tabs>',
        '  <Tab label="One">',
        '    First **tab**.',
        '  </Tab>',
        '</Tabs>',
        '',
        '<Preview />',
        '',
        'Inline <Badge>new</Badge> text.',
        '',
        '<Callout variant="warning">',
        '  Check this.',
        '',
        '  And this.',
        '</Callout>',
        '',
        '<Callout title="Keyboard">Press Enter.</Callout>'
      )
    });
    expect(markdown).toBe(
      lines(
        'First **tab**.',
        '',
        'Inline new text.',
        '',
        '> **Warning:** Check this.',
        '>',
        '> And this.',
        '',
        '> **Keyboard:** Press Enter.'
      )
    );
  });

  test('THEN site components override the defaults and get attributes and children', async () => {
    const converter = vi.fn(
      async ({ name, attributes, children, inline }) =>
        `${name} ${JSON.stringify(attributes)} ${children} ${inline}`
    );
    const markdown = await toMarkdown(
      {
        ...page,
        content: lines(
          '<LivePreview componentName="button" open size={2}>Demo</LivePreview>',
          '',
          '<Callout>Mine.</Callout>',
          '',
          '<Hidden>Secret</Hidden>',
          '',
          'Text with <LivePreview>inline</LivePreview>.'
        )
      },
      { components: { LivePreview: converter, Callout: () => 'Custom', Hidden: () => null } }
    );
    expect(markdown).toBe(
      lines(
        'LivePreview {"componentName":"button","open":true,"size":{"expression":"2"}} Demo false',
        '',
        'Custom',
        '',
        'Text with LivePreview {} inline true.'
      )
    );
    expect(converter).toHaveBeenCalledWith(expect.objectContaining({ name: 'LivePreview' }), {
      ...page,
      content: expect.any(String)
    });
  });

  test('THEN it makes relative links and images absolute', async () => {
    const markdown = await toMarkdown({
      ...page,
      content: lines(
        '[Examples](./examples) [Up](../index#top) [Root](/docs/a) [Web](https://x.dev) [Here](#usage)',
        '',
        '![Logo](./images/logo.png)'
      )
    });
    expect(markdown).toBe(
      lines(
        '[Examples](/docs/button/examples) [Up](/docs/index#top) [Root](/docs/a) [Web](https://x.dev) [Here](#usage)',
        '',
        '![Logo](/docs/button/images/logo.png)'
      )
    );
  });

  test('THEN it puts links and images on the site URL when it is set', async () => {
    const markdown = await toMarkdown(
      {
        ...page,
        content: lines(
          '[Examples](./examples) [Root](/docs/a) [Web](https://x.dev) [Here](#usage) [CDN](//cdn.example.com/a)',
          '',
          '![Logo](./images/logo.png)'
        )
      },
      { siteUrl: 'https://example.com/' }
    );
    expect(markdown).toBe(
      lines(
        '[Examples](https://example.com/docs/button/examples) [Root](https://example.com/docs/a) [Web](https://x.dev) [Here](#usage) [CDN](//cdn.example.com/a)',
        '',
        '![Logo](https://example.com/docs/button/images/logo.png)'
      )
    );
  });

  test('THEN it returns undefined for invalid MDX', async () => {
    expect(await toMarkdown({ ...page, content: '<Unclosed>' })).toBeUndefined();
  });
});

describe('GIVEN the LlmsTxtPlugin', () => {
  const frontmatter = (values: Record<string, unknown>) => `---\n${JSON.stringify(values)}\n---\n`;
  const files = {
    '/docs/index.mdx': `${frontmatter({
      fullPath: '/docs/index.mdx',
      route: '/docs/index',
      title: 'Docs',
      description: 'All the docs.'
    })}# {meta.title}\n\nWelcome.\n`,
    '/docs/button/index.mdx': `${frontmatter({
      fullPath: '/docs/button/index.mdx',
      route: '/docs/button/index',
      title: 'Button',
      data: { description: 'A `Button` starts an action.' },
      lastModified: 1735689600000,
      version: '2.1',
      tags: ['actions', 'forms'],
      owner: { team: 'Design' }
    })}Use <Thing />[examples](./examples).\n`,
    '/docs/button/examples.mdx': `${frontmatter({
      fullPath: '/docs/button/examples.mdx',
      route: '/docs/button/examples',
      title: 'Button examples'
    })}Examples.\n`,
    '/docs/hidden.mdx': `${frontmatter({
      fullPath: '/docs/hidden.mdx',
      route: '/docs/hidden',
      title: 'Hidden',
      llms: { exclude: true }
    })}Secret.\n`,
    '/docs/broken.mdx': `${frontmatter({
      fullPath: '/docs/broken.mdx',
      route: '/docs/broken',
      title: 'Broken'
    })}<Open>\n`,
    '/docs/data.json': JSON.stringify({ route: '/docs/data', title: 'Data' })
  };

  async function run(options: Record<string, unknown> = {}) {
    const filesystem = new MutableVolume(new FileAccess(Volume.fromJSON(files)), 'docs');
    let data: Record<string, unknown> = {};
    const beforeSend = LlmsTxtPlugin.$beforeSend!;
    let error: unknown;
    try {
      await beforeSend(
        filesystem,
        {
          config: { setData: (next: Record<string, unknown>) => (data = { ...data, ...next }) },
          serialiser: {
            deserialise: (fullPath: string, raw: Buffer) =>
              fullPath.endsWith('.json')
                ? JSON.parse(String(raw))
                : mdxSerialiser.deserialise(fullPath, raw)
          },
          ignorePages: ['shared-config.json'],
          pageExtensions: ['.mdx', '.json']
        } as unknown as Parameters<typeof beforeSend>[1],
        options
      );
    } catch (thrown) {
      error = thrown;
    }
    const shared = new MutableVolume(new FileAccess(new Volume()), '*');
    const afterUpdate = LlmsTxtPlugin.afterUpdate!;
    await afterUpdate(
      {} as Parameters<typeof afterUpdate>[0],
      {
        sharedFilesystem: shared,
        globalConfig: { data }
      } as unknown as Parameters<typeof afterUpdate>[1],
      options
    );
    return { written: shared.toJSON() as Record<string, string>, error };
  }

  test('THEN it writes each page as Markdown with frontmatter, in route order', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { written } = await run({ siteUrl: 'https://example.com/' });
    const file = JSON.parse(written[MARKDOWN_PAGES_FILE]);
    expect(file.version).toBe(1);
    expect(Object.keys(file.pages)).toEqual([
      '/docs/index',
      '/docs/button/index',
      '/docs/button/examples'
    ]);
    expect(file.pages['/docs/button/index']).toBe(
      lines(
        '---',
        'title: "Button"',
        'description: "A Button starts an action."',
        'url: "https://example.com/docs/button/index"',
        'lastModified: "2025-01-01T00:00:00.000Z"',
        '---',
        '',
        '> For an index of all documentation, see [https://example.com/llms.txt](https://example.com/llms.txt).',
        '',
        'Use [examples](https://example.com/docs/button/examples).',
        ''
      )
    );
    expect(written[LLMS_FULL_TXT_FILE]).toBe(Object.values(file.pages).join('\n'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('/docs/broken.mdx is not valid MDX'));
    warn.mockRestore();
  });

  test('THEN it copies the frontmatter fields it is asked for, when they are text or lists', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { written } = await run({
      frontmatterFields: ['version', 'tags', 'owner', 'missing', 'title', 'bad key', 'tags']
    });
    const page = JSON.parse(written[MARKDOWN_PAGES_FILE]).pages['/docs/button/index'];
    expect(page.split('\n---\n')[0]).toBe(
      lines(
        '---',
        'title: "Button"',
        'description: "A Button starts an action."',
        'url: "/docs/button/index"',
        'lastModified: "2025-01-01T00:00:00.000Z"',
        'version: "2.1"',
        'tags: ["actions","forms"]'
      )
    );
    expect(page).toContain('Use [examples](/docs/button/examples).');
    vi.restoreAllMocks();
  });

  test('THEN it writes an llms.txt index with a section per folder', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { written } = await run({ title: 'Example', description: 'Example docs.' });
    expect(written[LLMS_TXT_FILE]).toBe(
      lines(
        '# Example',
        '',
        '> Example docs.',
        '',
        '## [Docs](/docs/index.md)',
        '',
        'All the docs.',
        '',
        '## [Button](/docs/button/index.md)',
        '',
        'A Button starts an action.',
        '',
        '- [Button examples](/docs/button/examples.md)',
        ''
      )
    );
    vi.restoreAllMocks();
  });

  test('THEN it leaves out pages whose own path matches the exclude option', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { written } = await run({ exclude: ['docs/button/**'] });
    expect(Object.keys(JSON.parse(written[MARKDOWN_PAGES_FILE]).pages)).toEqual(['/docs/index']);
    vi.restoreAllMocks();
  });

  test('THEN it names sections without an index page after their folder', () => {
    expect(
      buildLlmsTxt({
        '/docs/getting-started/install': { title: 'Install', markdown: '' }
      })
    ).toBe(
      lines(
        '# Documentation',
        '',
        '## Getting started',
        '',
        '- [Install](/docs/getting-started/install.md)',
        ''
      )
    );
  });

  describe('WHEN the site has its own components', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-llms-'));
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    test('THEN it converts them with the components module', async () => {
      const modulePath = path.join(dir, 'components.mjs');
      fs.writeFileSync(modulePath, 'export default { Thing: () => "a thing " };\n');
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { written } = await run({ componentsModulePath: modulePath });
      expect(JSON.parse(written[MARKDOWN_PAGES_FILE]).pages['/docs/button/index']).toContain(
        'Use a thing[examples](/docs/button/examples).'
      );
      const fromUrl = await run({ componentsModulePath: pathToFileURL(modulePath).href });
      expect(
        JSON.parse(fromUrl.written[MARKDOWN_PAGES_FILE]).pages['/docs/button/index']
      ).toContain('Use a thing');
      vi.restoreAllMocks();
    });

    test('THEN a converter that throws fails the plugin but keeps the other pages', async () => {
      const modulePath = path.join(dir, 'throws.mjs');
      fs.writeFileSync(
        modulePath,
        'export default { Thing: () => { throw new Error("no data"); } };\n'
      );
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { written, error } = await run({ componentsModulePath: modulePath });
      expect(String(error)).toContain('/docs/button/index.mdx: no data');
      expect(Object.keys(JSON.parse(written[MARKDOWN_PAGES_FILE]).pages)).toEqual([
        '/docs/index',
        '/docs/button/examples'
      ]);
      vi.restoreAllMocks();
    });
  });
});
