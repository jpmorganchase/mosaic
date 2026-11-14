import { Volume } from 'memfs';
import { describe, expect, test, vi } from 'vitest';
import FileAccess from '../../../core/src/filesystems/FileAccess';
import MutableVolume from '../../../core/src/filesystems/MutableVolume';
import mdxSerialiser from '../../../serialisers/src/mdx';
import { serializeMdxForClient } from '../../../site-middleware/src/serializeMdxForClient';
import SearchIndexPlugin, { SEARCH_RECORDS_FILE } from '../SearchIndexPlugin';
import TableOfContentsPlugin from '../TableOfContentsPlugin';
import { buildSearchRecords } from '../utils/searchRecords';

const page = {
  route: '/docs/button/index',
  title: 'Button',
  data: { description: 'An interactive component.', tags: ['action', 3, { no: true }] },
  keywords: ['Action', 'UI action'],
  content: [
    "import { Thing } from './thing';",
    '',
    '# {meta.title}',
    '',
    'Buttons start actions. Use {meta.data.description}',
    '',
    '## Examples for {meta.title}',
    '',
    'Use `Button` for actions.',
    '',
    '<LivePreview componentName="button" exampleName="Accented" />',
    '',
    '```js',
    'import { Button } from "@salt-ds/core";',
    '```',
    '',
    '### Disabled',
    '',
    'Disabled buttons can’t be pressed.',
    '',
    '#### Notes',
    '',
    'A deeper heading stays in its section.',
    '',
    '## Examples for {meta.title}',
    '',
    'A repeated heading.',
    '',
    '## Accessibility',
    '',
    '<Callout title="Keyboard">Press Enter or Space.</Callout>',
    ''
  ].join('\n')
};

describe('GIVEN buildSearchRecords', () => {
  test('THEN it splits a page into an introduction and sections', () => {
    expect(buildSearchRecords(page)).toEqual([
      {
        id: '/docs/button/index',
        route: '/docs/button/index',
        title: 'Button',
        headings: [],
        text: 'Buttons start actions. Use An interactive component.',
        namespace: 'docs',
        fields: { description: 'An interactive component.', keywords: ['Action', 'UI action'] }
      },
      {
        id: '/docs/button/index#examples-for-button',
        route: '/docs/button/index',
        anchor: 'examples-for-button',
        title: 'Button',
        headings: ['Examples for Button'],
        text: 'Use Button for actions.',
        namespace: 'docs'
      },
      {
        id: '/docs/button/index#disabled',
        route: '/docs/button/index',
        anchor: 'disabled',
        title: 'Button',
        headings: ['Examples for Button', 'Disabled'],
        text: 'Disabled buttons can’t be pressed. Notes A deeper heading stays in its section.',
        namespace: 'docs'
      },
      {
        id: '/docs/button/index#examples-for-button-1',
        route: '/docs/button/index',
        anchor: 'examples-for-button-1',
        title: 'Button',
        headings: ['Examples for Button'],
        text: 'A repeated heading.',
        namespace: 'docs'
      },
      {
        id: '/docs/button/index#accessibility',
        route: '/docs/button/index',
        anchor: 'accessibility',
        title: 'Button',
        headings: ['Accessibility'],
        text: 'Press Enter or Space.',
        namespace: 'docs'
      }
    ]);
  });

  test('THEN its anchors are the ids of the rendered headings and of the table of contents', async () => {
    const anchors = buildSearchRecords(page)!.flatMap(record => record.anchor ?? []);

    const frontmatter = `---\n${JSON.stringify({ title: page.title, data: page.data })}\n---\n`;
    const body = page.content.replace(/^import .*$/m, '').replace(/<LivePreview[^>]*\/>/, '');
    const compiled = await serializeMdxForClient(frontmatter + body, { highlight: false });
    if (!('compiledSource' in compiled)) throw new Error('compile failed');
    const renderedIds = [...compiled.compiledSource.matchAll(/id: "([^"]*)"/g)].map(([, id]) => id);
    expect(renderedIds).toEqual(expect.arrayContaining(anchors));

    const tocPage = { ...page, fullPath: '/docs/button/index.mdx' };
    const run = TableOfContentsPlugin.$afterSource!;
    await run([tocPage], { config: { setData: vi.fn() } } as unknown as Parameters<typeof run>[1], {
      minRank: 2,
      maxRank: 3
    });
    expect(
      (tocPage as { tableOfContents?: { id: string }[] }).tableOfContents!.map(i => i.id)
    ).toEqual(anchors);
  });

  test('THEN it reads configured fields, uses the first path that is set and keeps only text', () => {
    const [intro] = buildSearchRecords(page, {
      fields: { summary: ['missing', 'data.description'], tags: 'data.tags', nothing: 'data.none' }
    })!;
    expect(intro.fields).toEqual({ summary: 'An interactive component.', tags: ['action', '3'] });
  });

  test('THEN it can keep deeper headings as sections and cut long text', () => {
    const records = buildSearchRecords(page, { sectionDepth: 4, maxTextLength: 10 })!;
    expect(records.map(record => record.anchor)).toContain('notes');
    expect(records[0].text).toBe('Buttons st');
  });

  test('WHEN the page is not valid MDX THEN it returns undefined', () => {
    expect(buildSearchRecords({ route: '/docs/broken', content: '<Unclosed' })).toBeUndefined();
  });
});

describe('GIVEN the SearchIndexPlugin', () => {
  const files = {
    '/docs/button/index.mdx': `---\n${JSON.stringify({
      route: '/docs/button/index',
      title: 'Button'
    })}\n---\n## Usage\n\nUse it.\n`,
    '/docs/hidden.mdx': `---\n${JSON.stringify({
      route: '/docs/hidden',
      title: 'Hidden',
      search: { exclude: true }
    })}\n---\nSecret.\n`,
    '/docs/data.json': JSON.stringify({ route: '/docs/data', title: 'Data' })
  };

  async function run(options: Record<string, unknown> = {}) {
    const filesystem = new MutableVolume(new FileAccess(Volume.fromJSON(files)), 'docs');
    let data: Record<string, unknown> = {};
    const beforeSend = SearchIndexPlugin.$beforeSend!;
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
        pageExtensions: ['.mdx']
      } as unknown as Parameters<typeof beforeSend>[1],
      options
    );
    const writeFile = vi.fn();
    const afterUpdate = SearchIndexPlugin.afterUpdate!;
    await afterUpdate(
      {} as Parameters<typeof afterUpdate>[0],
      {
        sharedFilesystem: { promises: { writeFile } },
        globalConfig: { data }
      } as unknown as Parameters<typeof afterUpdate>[1],
      options
    );
    return writeFile;
  }

  test('THEN it writes search-records.json for pages that are not excluded', async () => {
    const writeFile = await run();
    const [, json] = writeFile.mock.calls.find(([name]) => name === SEARCH_RECORDS_FILE)!;
    const file = JSON.parse(json);
    expect(file.version).toBe(1);
    expect(file.records.map((record: { id: string }) => record.id)).toEqual([
      '/docs/button/index',
      '/docs/button/index#usage'
    ]);
    // The existing files are still written.
    expect(writeFile).toHaveBeenCalledWith('/search-data.json', expect.any(String));
  });

  test('WHEN records are turned off THEN it does not write search-records.json', async () => {
    const writeFile = await run({ records: false });
    expect(writeFile.mock.calls.map(([name]) => name)).not.toContain(SEARCH_RECORDS_FILE);
  });
});
