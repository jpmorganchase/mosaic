import { describe, expect, test } from 'vitest';
import { serialize, type SerializeResult } from 'next-mdx-remote-client/serialize';
import type { SerializedMdxResult } from '@jpmorganchase/mosaic-types';

import { serializeMdxForClient } from '../serializeMdxForClient.js';

describe('serialized MDX result compatibility', () => {
  test('accepts upstream payloads in both directions without transforming them', async () => {
    const upstream: SerializeResult<{ title: string }, { count: number }> = await serialize({
      source: '---\ntitle: Portable\n---\n# {count}',
      options: { parseFrontmatter: true, scope: { count: 2 } }
    });
    const mosaic: SerializedMdxResult<{ title: string }, { count: number }> = upstream;
    const roundTrip: SerializeResult<{ title: string }, { count: number }> = mosaic;
    expect(roundTrip).toBe(upstream);
    expect(mosaic.frontmatter.title).toBe('Portable');
    expect(mosaic.scope.count).toBe(2);
    expect('compiledSource' in mosaic && mosaic.compiledSource).toBeTruthy();
  });

  test('preserves the failure payload and its metadata', () => {
    const error = new Error('Invalid MDX');
    const mosaic: SerializedMdxResult = { error, frontmatter: {}, scope: {} };
    const upstream: SerializeResult = mosaic;
    const roundTrip: SerializedMdxResult = upstream;
    expect(roundTrip).toBe(mosaic);
    expect(roundTrip.error).toBe(error);
  });

  test('exposes typed frontmatter from the public serializer', async () => {
    const result: SerializedMdxResult<{ title: string }> = await serializeMdxForClient<{
      title: string;
    }>('---\ntitle: Mosaic\n---\n# {meta.title}', { highlight: false });
    expect(result.frontmatter.title).toBe('Mosaic');
    expect(result.scope.meta).toEqual({ title: 'Mosaic' });
  });
});

describe('serializeMdxForClient compile cache', () => {
  test('reuses the compiled result for identical source', async () => {
    const source = '---\ntitle: Cached\n---\n# {meta.title}\n';
    const first = await serializeMdxForClient(source, { highlight: false });
    const second = await serializeMdxForClient(source, { highlight: false });
    expect('compiledSource' in first && first.compiledSource).toBeTruthy();
    expect(second).toBe(first);
  });

  test('compiles different source separately', async () => {
    const a = await serializeMdxForClient('# A\n', { highlight: false });
    const b = await serializeMdxForClient('# B\n', { highlight: false });
    expect(b).not.toBe(a);
  });

  test('does not cache calls with custom plugins', async () => {
    const plugin = () => () => undefined;
    const source = '# Plugins\n';
    const first = await serializeMdxForClient(source, {
      highlight: false,
      remarkPlugins: [plugin]
    });
    const second = await serializeMdxForClient(source, {
      highlight: false,
      remarkPlugins: [plugin]
    });
    expect(second).not.toBe(first);
  });

  test('does not cache compile errors', async () => {
    const broken = '# Broken <Unclosed\n';
    const first = await serializeMdxForClient(broken, { highlight: false });
    const second = await serializeMdxForClient(broken, { highlight: false });
    expect('error' in first && first.error).toBeTruthy();
    expect(second).not.toBe(first);
  });
});

describe('serializeMdxForClient heading ids', () => {
  const compiled = async (source: string, scope?: Record<string, unknown>) => {
    const result = await serializeMdxForClient(source, { highlight: false, scope });
    if (!('compiledSource' in result)) throw new Error('compile failed');
    return result.compiledSource;
  };

  test('resolves meta tokens in headings before slugging them', async () => {
    const source = [
      '---',
      'title: Card',
      'data:',
      '  example: { title: Card example }',
      '---',
      '# {meta.title}',
      '',
      '## Examples for {meta.title}',
      '',
      '## {meta.data.example.title}',
      ''
    ].join('\n');
    const code = await compiled(source);
    expect(code).toContain('id: "card"');
    expect(code).toContain('id: "examples-for-card"');
    expect(code).toContain('id: "card-example"');
  });

  test('numbers repeated headings consistently when one is a meta token', async () => {
    const code = await compiled('---\ntitle: Usage\n---\n## {meta.title}\n\n## Usage\n');
    expect(code).toContain('id: "usage"');
    expect(code).toContain('id: "usage-1"');
  });

  test('leaves unresolved and non-text values as expressions', async () => {
    const code = await compiled(
      '---\nflag: true\n---\n## About {meta.missing}\n\n## A {meta.flag}\n'
    );
    expect(code).toContain('id: "about-"');
    expect(code).toContain('id: "a-"');
    expect(code).toContain('meta.missing');
    expect(code).toContain('meta.flag');
  });

  test('uses the meta passed in scope', async () => {
    const code = await compiled('---\ntitle: Ignored\n---\n## {meta.title}\n', {
      meta: { title: 'From scope' }
    });
    expect(code).toContain('id: "from-scope"');
  });
});
