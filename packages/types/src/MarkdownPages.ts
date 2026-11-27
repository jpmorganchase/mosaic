/**
 * The format of `markdown-pages.json`, written by `LlmsTxtPlugin`: every
 * page as Markdown, for agents and other tools that read docs as text.
 */
export interface MarkdownPagesFile {
  version: 1 | 2;
  /** Each page's Markdown, keyed by logical route (v1) or encoded URL pathname (v2). */
  pages: Record<string, string>;
}

/** Lightweight discovery and ownership manifest emitted by LlmsTxtPlugin. */
export interface LlmsManifest {
  version: 1 | 2;
  /** Canonical public routes with generated Markdown, encoded in v2. Aliases are not listed. */
  routes: string[];
  /** Normalized public prefixes owning llms.txt and llms-full.txt artifacts. */
  scopes: string[];
  siteUrl?: string;
}
