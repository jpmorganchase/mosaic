/**
 * The format of `markdown-pages.json`, written by `LlmsTxtPlugin`: every
 * page as Markdown, for agents and other tools that read docs as text.
 */
export interface MarkdownPagesFile {
  version: 1;
  /** Each page's Markdown, with YAML frontmatter, keyed by route. */
  pages: Record<string, string>;
}
