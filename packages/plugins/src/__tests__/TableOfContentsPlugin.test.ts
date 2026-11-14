import { Volume } from 'memfs';
import { describe, expect, test, vi } from 'vitest';
import FileAccess from '../../../core/src/filesystems/FileAccess';
import MutableVolume from '../../../core/src/filesystems/MutableVolume';
import mdxSerialiser from '../../../serialisers/src/mdx';
import TableOfContentsPlugin, { resolveHeading } from '../TableOfContentsPlugin';

const options = { minRank: 2, maxRank: 3 } as const;

async function afterSource(pages: any[]) {
  const setData = vi.fn();
  const run = TableOfContentsPlugin.$afterSource!;
  const result = await run(
    pages,
    { config: { setData } } as unknown as Parameters<typeof run>[1],
    options
  );
  return { pages: result as any[], setData };
}

describe('GIVEN the TableOfContentsPlugin', () => {
  test('THEN it resolves meta tokens anywhere in a heading', async () => {
    const { pages } = await afterSource([
      {
        fullPath: '/docs/card.mdx',
        title: 'Card',
        content: '## Examples for {meta.title}\n\n## {meta.title} props\n'
      }
    ]);
    expect(pages[0].tableOfContents).toEqual([
      { depth: 2, level: 0, id: 'examples-for-card', text: 'Examples for Card' },
      { depth: 2, level: 0, id: 'card-props', text: 'Card props' }
    ]);
  });

  test('WHEN a token does not resolve THEN it keeps the token and slugs the rendered text', async () => {
    const { pages, setData } = await afterSource([
      {
        fullPath: '/docs/card.mdx',
        data: { card: { $ref: '#/card' } },
        content: '## {meta.data.card.title}\n\n## About {meta.missing}\n'
      }
    ]);
    expect(pages[0].tableOfContents).toEqual([
      { depth: 2, level: 0, id: '', text: '{meta.data.card.title}' },
      { depth: 2, level: 0, id: 'about-', text: 'About {meta.missing}' }
    ]);
    expect(setData).toHaveBeenCalledWith({
      tableOfContentsUnresolved: { '/docs/card.mdx': true }
    });
  });

  test('THEN repeated headings are numbered across every rank, like the rendered ids', async () => {
    const { pages, setData } = await afterSource([
      {
        fullPath: '/docs/index.mdx',
        content: '# Overview\n\n## Overview\n\n#### Usage\n\n### Usage\n'
      }
    ]);
    expect(pages[0].tableOfContents.map(({ id }) => id)).toEqual(['overview-1', 'usage-1']);
    expect(setData).toHaveBeenCalledWith({ tableOfContentsUnresolved: {} });
  });

  test('WHEN references are resolved THEN $beforeSend rebuilds tables of contents that had unresolved tokens', async () => {
    const filesystem = new MutableVolume(
      new FileAccess(
        Volume.fromJSON({
          '/docs/card.mdx': [
            '---',
            'data:',
            '  card:',
            '    title: Card example',
            'tableOfContents: []',
            '---',
            '## {meta.data.card.title}',
            ''
          ].join('\n')
        })
      ),
      'docs'
    );
    const run = TableOfContentsPlugin.$beforeSend!;
    await run(
      filesystem,
      {
        config: { data: { tableOfContentsUnresolved: { '/docs/card.mdx': true } } },
        serialiser: mdxSerialiser
      } as unknown as Parameters<typeof run>[1],
      options
    );

    const page = await mdxSerialiser.deserialise(
      '/docs/card.mdx',
      await filesystem.promises.readFile('/docs/card.mdx')
    );
    expect(page.tableOfContents).toEqual([
      { depth: 2, level: 0, id: 'card-example', text: 'Card example' }
    ]);
    expect(page.content.trim()).toBe('## {meta.data.card.title}');
  });

  test('THEN only strings and numbers resolve', () => {
    const page = { title: 'Card', count: 3, flag: true, nothing: null };
    expect(resolveHeading(page, '{meta.title} {meta.count}')).toEqual({
      text: 'Card 3',
      slugText: 'Card 3',
      resolved: true
    });
    expect(resolveHeading(page, 'A {meta.flag}{meta.nothing}')).toEqual({
      text: 'A {meta.flag}{meta.nothing}',
      slugText: 'A ',
      resolved: false
    });
  });
});
