/**
 * Server-side highlighting of MDX code fences via shiki.
 *
 * Locks in the `highlight` option of `serializeMdxForClient`: known
 * languages emit `data-mosaic-html` on the compiled `<code>`,
 * unknown / plain-text languages don't (no compile failure either),
 * `highlight: false` disables the plugin, and repeated fences each
 * get their own attribute (the cache only dedups shiki invocations).
 *
 * Asserts against the compiled-source string, not intermediate hast
 * — that's the payload the client actually receives.
 */
import { test, expect } from 'vitest';
import { serializeMdxForClient } from '../../serializeMdxForClient.js';

// Locally-recovered success-branch type. Avoids importing
// `SerializeResult` from `next-mdx-remote-client/serialize` (ESM-only,
// trips TS1479 under this package's CommonJS test build).
type SerializeOk = Awaited<ReturnType<typeof serializeMdxForClient>> & { compiledSource: string };

const MDX_WITH_TSX = ['# Example', '', '```tsx', 'const x: number = 1;', '```', ''].join('\n');

const MDX_WITH_PLAIN = ['```text', 'just plain text, no grammar', '```', ''].join('\n');

const MDX_WITH_UNKNOWN_LANG = ['```not-a-real-language-12345', 'whatever', '```', ''].join('\n');

const MDX_WITH_REPEATS = [
  '```ts',
  'const a = 1;',
  '```',
  '',
  '```ts',
  'const a = 1;',
  '```',
  ''
].join('\n');

// Count `data-mosaic-html` attributes in the compiled JSX. Simple
// substring match — enough to lock in structural presence without
// parsing the JS payload.
function countHighlightedCodeNodes(compiled: string): number {
  return (compiled.match(/"data-mosaic-html":\s*"/g) ?? []).length;
}

// `SerializeResult` is a discriminated success / error union. This
// helper narrows to success so each test doesn't repeat a type guard.
function ok(result: Awaited<ReturnType<typeof serializeMdxForClient>>): SerializeOk {
  if ('error' in result && result.error) throw result.error;
  return result as SerializeOk;
}

test('highlight: true (default) attaches data-mosaic-html for known languages', async () => {
  const result = ok(await serializeMdxForClient(MDX_WITH_TSX));
  expect(countHighlightedCodeNodes(result.compiledSource)).toBeGreaterThan(0);
  // Shiki always emits a `<pre class="shiki …">` wrapper.
  expect(result.compiledSource).toMatch(/shiki/);
});

test('plain-text languages do not get a data-mosaic-html attribute', async () => {
  const result = ok(await serializeMdxForClient(MDX_WITH_PLAIN));
  expect(countHighlightedCodeNodes(result.compiledSource)).toBe(0);
});

test('unknown languages fall back gracefully — no html attribute, no compile failure', async () => {
  // Plugin must swallow shiki failures so stale/typo'd language tags
  // don't break the whole MDX compile.
  const result = ok(await serializeMdxForClient(MDX_WITH_UNKNOWN_LANG));
  expect(countHighlightedCodeNodes(result.compiledSource)).toBe(0);
});

test('highlight: false disables the plugin even for known languages', async () => {
  const result = ok(await serializeMdxForClient(MDX_WITH_TSX, { highlight: false }));
  expect(countHighlightedCodeNodes(result.compiledSource)).toBe(0);
});

test('per-compile dedup: identical fences each emit a data-mosaic-html attr', async () => {
  // Both blocks get the attribute on their own `<code>`; the cache
  // just avoids a redundant shiki invocation.
  const result = ok(await serializeMdxForClient(MDX_WITH_REPEATS));
  expect(countHighlightedCodeNodes(result.compiledSource)).toBe(2);
});
