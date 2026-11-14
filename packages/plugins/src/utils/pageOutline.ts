import Slugger from 'github-slugger';

/**
 * Heading helpers shared by `TableOfContentsPlugin` and the search records
 * built by `SearchIndexPlugin`, so table-of-contents links and search
 * results point at the same heading ids. `serializeMdxForClient` gives the
 * rendered headings those ids: it resolves `{meta.*}` the same way, then
 * `rehype-slug` slugs every heading in order with `github-slugger`.
 */

const META_TOKEN = /\{\s*meta((?:\.[A-Za-z_$][\w$]*)+)\s*\}/g;

export type PageValues = Record<string, unknown>;

/** Reads a dotted path such as `data.description` from page frontmatter. */
export const lookup = (page: PageValues, path: string) =>
  path
    .replace(/^\./, '')
    .split('.')
    .reduce<unknown>(
      (value, key) => (value == null ? undefined : (value as PageValues)[key]),
      page
    );

// Only strings and numbers render as text; React renders nothing for booleans and null.
export const asText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

/**
 * Resolves every `{meta.<path>}` token in a heading against the page.
 *
 * `text` keeps tokens that don't resolve, so authors can spot them in the
 * table of contents. `slugText` drops them instead: they render as nothing,
 * and the heading's `id` is built from its rendered text.
 */
export const resolveHeading = (page: PageValues, heading: string) => {
  let resolved = true;
  const text = heading.replace(META_TOKEN, (token, path) => {
    const value = asText(lookup(page, path));
    if (value === undefined) resolved = false;
    return value ?? token;
  });
  const slugText = heading.replace(META_TOKEN, (_token, path) => asText(lookup(page, path)) ?? '');
  return { text: text.trim(), slugText, resolved };
};

/**
 * Returns a function that turns heading text into a heading id. Call it for
 * every heading on a page in document order, as `rehype-slug` does, so
 * repeated headings get the same `-1`, `-2` suffixes.
 */
export const createHeadingSlugger = () => {
  const slugger = new Slugger();
  return (slugText: string) => slugger.slug(slugText);
};
