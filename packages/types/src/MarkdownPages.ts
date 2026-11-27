/**
 * The format of `markdown-pages.json`, written by `LlmsTxtPlugin`: every
 * page as Markdown, for agents and other tools that read docs as text.
 */
export interface MarkdownPagesFile {
  version: 1;
  /** Each page's Markdown, with YAML frontmatter, keyed by route. */
  pages: Record<string, string>;
}

/** Lightweight discovery and ownership manifest emitted by LlmsTxtPlugin. */
export interface LlmsManifest {
  version: 1;
  /** Canonical public routes with generated Markdown. Aliases are not listed. */
  routes: string[];
  /** Normalized public prefixes owning llms.txt and llms-full.txt artifacts. */
  scopes: string[];
  siteUrl?: string;
}
