/**
 * Server-side syntax-highlighting rehype plugin.
 *
 * Finds `<pre><code class="language-…">` fences in the rehype hast,
 * runs shiki, and attaches the highlighted HTML to the `<code>` as a
 * `data-mosaic-html` attribute (with the original source preserved
 * on `data-mosaic-source` for copy-to-clipboard). The consuming
 * `<Pre>` reads those attributes and skips its client-side
 * `import('shiki')`, removing ~150 KB of shiki + grammars from every
 * docs page that contains a code block.
 *
 * Fully backward-compatible: if the plugin is disabled or the
 * language isn't loadable, the attributes are absent and `<Pre>`
 * falls back to its existing client-side highlight path.
 *
 * Server-only.
 */
import type { Element, Root } from 'hast';
import type { Plugin, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { Highlighter } from 'shiki';

if (typeof window !== 'undefined') {
  throw new Error('highlightCodeBlocks.ts must not be imported on the client.');
}

export interface HighlightCodeBlocksOptions {
  /**
   * Languages preloaded into the shiki highlighter. Languages not in
   * this list are loaded on demand on first use, then cached for the
   * rest of the build. Default covers what the Mosaic docs corpora
   * use today; extend per host if your content uses more.
   */
  langs?: string[];
  /**
   * Themes shiki should compile against. Default matches the existing
   * client-side `Pre` (`github-light` / `github-dark`) so the visual
   * output is identical to the pre-migration baseline.
   *
   * Provide an object (`{ light, dark }`) for dual-theme output (uses
   * shiki's CSS-variable-based dual-theme mode); a single string for
   * single-theme.
   */
  themes?: { light: string; dark: string } | string;
  /**
   * Languages that should be treated as "not highlightable" without
   * triggering shiki's `Loading language X failed` warning. Code
   * blocks tagged with these languages keep their plain text; the
   * client `<Pre>` will render them unhighlighted via its existing
   * fallback. Default: `['text', 'plain', 'plaintext', 'txt']`.
   */
  plainLanguages?: string[];
}

const DEFAULT_LANGS = [
  'bash',
  'css',
  'diff',
  'html',
  'js',
  'json',
  'jsx',
  'md',
  'mdx',
  'shell',
  'sh',
  'ts',
  'tsx',
  'yaml'
];

const DEFAULT_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

const DEFAULT_PLAIN_LANGS = new Set(['text', 'plain', 'plaintext', 'txt', '']);

// Module-level highlighter singleton. shiki's `createHighlighter` is
// expensive (WASM init + theme parsing) and the result is safe to
// share across calls — internally it's a registry plus pure functions.
// Initialised lazily on first use; subsequent calls await the same
// promise.
let highlighterPromise: Promise<Highlighter> | undefined;

async function getHighlighter(
  langs: string[],
  themes: HighlightCodeBlocksOptions['themes']
): Promise<Highlighter> {
  if (!highlighterPromise) {
    // Dynamic import: keeps shiki out of `serializeMdxForClient`'s
    // static dependency graph when the plugin is disabled, and means
    // unused builds of `mosaic-site-middleware` don't pay shiki's
    // WASM-load cost.
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki');
      const themeList =
        typeof themes === 'string'
          ? [themes]
          : [themes?.light ?? DEFAULT_THEMES.light, themes?.dark ?? DEFAULT_THEMES.dark];
      return createHighlighter({
        langs,
        themes: themeList
      });
    })();
  }
  return highlighterPromise;
}

/**
 * Identify the `language-xxx` class on a hast `<code>` element and
 * return the language token (`tsx`, `bash`, …) or `undefined` if
 * absent. Markdown-it / micromark / mdast-util-from-markdown all use
 * this convention.
 */
function getLanguageFromCode(code: Element): string | undefined {
  const cls = code.properties?.className;
  if (!cls) return undefined;
  const list = Array.isArray(cls) ? cls : [cls];
  for (const c of list) {
    if (typeof c !== 'string') continue;
    if (c.startsWith('language-')) return c.slice('language-'.length);
  }
  return undefined;
}

/**
 * Concatenate all text-node descendants of a node. Code blocks emitted
 * by the markdown pipeline are a single `<code>` containing a single
 * text node, but defending against deeper trees keeps the plugin
 * robust if a future remark/rehype plugin inserts wrapper spans.
 */
function collectText(node: Element): string {
  let acc = '';
  visit(node, 'text', (t: { value: string }) => {
    acc += t.value;
  });
  return acc;
}

export function highlightCodeBlocks(options: HighlightCodeBlocksOptions = {}): Plugin<[], Root> {
  const langs = options.langs ?? DEFAULT_LANGS;
  const themes = options.themes ?? DEFAULT_THEMES;
  const plainLangs = new Set([...DEFAULT_PLAIN_LANGS, ...(options.plainLanguages ?? [])]);

  // Per-compile dedup: identical (lang, code) pairs in the same MDX
  // file (common in docs that repeat snippets across tabs) only run
  // shiki once. Cleared between MDX files; cross-file caching is
  // handled by the surrounding `unstable_cache(getMdxRaw)` layer.
  const transformer: Transformer<Root> = async ast => {
    const cache = new Map<string, string>();
    const targets: Array<{ pre: Element; code: Element; language: string; source: string }> = [];

    visit(ast, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return;
      // Code fences emit <pre> with a single <code> child; raw <pre>
      // JSX elements are MDX-JSX-typed and not visited by the hast
      // 'element' walker.
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (!child || child.type !== 'element' || child.tagName !== 'code') return;
      const language = getLanguageFromCode(child);
      if (!language || plainLangs.has(language)) return;
      const source = collectText(child);
      if (!source) return;
      targets.push({ pre: node, code: child, language, source });
    });

    if (targets.length === 0) return;

    const hl = await getHighlighter(langs, themes);

    for (const { pre, code, language, source } of targets) {
      const cacheKey = `${language}\u0000${source}`;
      let html = cache.get(cacheKey);

      if (html === undefined) {
        const loaded = hl.getLoadedLanguages();
        if (!loaded.includes(language)) {
          try {
            await hl.loadLanguage(language as Parameters<Highlighter['loadLanguage']>[0]);
          } catch {
            // Unknown / unsupported language. Skip; client `<Pre>`'s
            // fallback path will render the raw code.
            continue;
          }
        }

        try {
          if (typeof themes === 'string') {
            html = hl.codeToHtml(source, { lang: language, theme: themes });
          } else {
            html = hl.codeToHtml(source, {
              lang: language,
              themes,
              defaultColor: false
            });
          }
        } catch {
          continue;
        }

        cache.set(cacheKey, html);
      }

      // Attach the highlighted HTML to the `<code>` child via a
      // `data-mosaic-highlighted` attribute carrying the raw HTML.
      // The consuming `<Pre>` reads `children.props['data-mosaic-html']`
      // and renders it via `dangerouslySetInnerHTML`, skipping the
      // `await import('shiki')` fallback. The original `<code>` text
      // is preserved as a `data-mosaic-source` attribute so the
      // copy-button can pull it out without traversing the highlighted
      // span tree (which would interleave inline styles).
      //
      // Why attributes on `<code>` rather than `<pre>`: `<Pre>`
      // already destructures from its `children` (the `<code>`) to
      // recover `language` and `code`, so keeping the new data there
      // means a single read path. Why `data-*` rather than custom
      // props: MDX's JSX emitter passes through standard HTML
      // attributes verbatim; non-standard React props on intrinsic
      // elements produce React's "Unknown prop" warnings in dev.
      code.properties = {
        ...(code.properties ?? {}),
        'data-mosaic-html': html,
        'data-mosaic-source': source
      };
      // Convenience: parent `<pre>` carries a boolean marker so
      // `<Pre>` can short-circuit without inspecting its children
      // first. Optional — `<Pre>` works either way.
      pre.properties = { ...(pre.properties ?? {}), 'data-mosaic-highlighted': 'true' };
    }
  };

  return () => transformer;
}
