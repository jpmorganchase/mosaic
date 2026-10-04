import { describe, expect, test } from 'vitest';

import { serializeMdxForClient } from '../serializeMdxForClient.js';

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
