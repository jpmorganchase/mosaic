/**
 * Size limits for the editor's Server Actions, in UTF-8 bytes.
 *
 * Next.js rejects Server Action request bodies over 1 MB unless
 * `experimental.serverActions.bodySizeLimit` is raised, so
 * `next.config.js` must allow at least twice their sum: JSON escaping of
 * quotes, backslashes and newlines can double a string's size on the
 * wire. A test checks that the config keeps up with these values.
 */
export const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024;
export const MAX_FRONTMATTER_BYTES = 256 * 1024;
