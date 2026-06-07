/**
 * Overlay authored frontmatter on top of post-plugin `meta`,
 * preserving post-plugin values wherever the author's YAML
 * contains an unresolved Mosaic ref placeholder (`$tag`, `$ref`).
 *
 * Why this exists
 * ---------------
 * Mosaic content authors write refs like:
 *
 *   data:
 *     saltAnnouncement:
 *       $tag: salt-announcement
 *
 * The Mosaic CLI's `$TagPlugin` + `$RefPlugin` expand that on
 * the server into an array of matching pages, so by the time
 * the page renders, `meta.data.saltAnnouncement` is an array
 * the MDX body iterates over (`.filter(...).map(...)`).
 *
 * The editor's preview compile pipeline doesn't run the Mosaic
 * CLI plugins — it just feeds the authored bytes (body +
 * frontmatter) through `serializeMdxForClient`. So a naive
 * `{ ...meta, ...authored }` merge clobbers the resolved array
 * with the `{ $tag: '...' }` placeholder, and the first
 * `.filter()` call in the MDX body throws
 * `meta.data.saltAnnouncement.filter is not a function`.
 *
 * Strategy
 * --------
 * Walk the authored object recursively. At each leaf:
 *
 *   - If the authored value is a ref placeholder (an object
 *     with exactly one key that is `$tag` or `$ref`), keep the
 *     post-plugin value from `meta` at the same path. The
 *     authored intent ("use this tag/ref") is structurally a
 *     subset of the post-plugin value, so the preview wants
 *     the expanded form.
 *   - Otherwise (and when `meta` has no matching path), use
 *     the authored value verbatim — author edits to scalar,
 *     array, and ordinary object fields must take effect.
 *
 * The walk is purely additive: post-plugin keys NOT mentioned
 * by the author pass through unchanged (matches the existing
 * `{ ...meta, ...authored }` semantic for "untouched keys keep
 * their resolved value").
 *
 * `frontmatterSnapshotRef` (and therefore this helper) only
 * sees the authored YAML, never the post-plugin frontmatter
 * the editor was seeded with — so the right comparison
 * baseline is `meta` at the same path.
 */

const REF_KEYS = new Set(['$tag', '$ref']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * `true` when `value` is an object of the shape
 * `{ $tag: '…' }` or `{ $ref: '…' }` — a Mosaic ref the
 * server-side plugin pipeline expands. Multi-key objects
 * (e.g. `{ $ref: '…', description: '…' }`) are not treated as
 * placeholders so the author can still annotate refs with
 * additional fields and have those overlay correctly.
 */
function isRefPlaceholder(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && REF_KEYS.has(keys[0]);
}

export function mergeAuthoredFrontmatter(
  meta: Record<string, unknown> | undefined,
  authored: Record<string, unknown>
): Record<string, unknown> {
  // Start from `meta` so post-plugin keys the author didn't
  // touch survive verbatim. Walking only `authored` keeps the
  // helper O(authored size) rather than O(meta size) — meta
  // for a Mosaic page can be megabytes of resolved refs.
  const out: Record<string, unknown> = { ...(meta ?? {}) };

  for (const [key, authoredValue] of Object.entries(authored)) {
    const metaValue = meta?.[key];

    if (isRefPlaceholder(authoredValue)) {
      // Author has a `$tag` / `$ref` here. If the post-plugin
      // `meta` carries an expanded value at the same path,
      // keep that — the preview compile needs the expanded
      // form so MDX iteration (`.filter`, `.map`) works. If
      // `meta` has nothing (or is itself still a placeholder
      // because the page was never resolved), fall through to
      // the authored placeholder; the body either won't
      // iterate or will surface the same error the published
      // page would.
      out[key] = metaValue !== undefined ? metaValue : authoredValue;
      continue;
    }

    if (isPlainObject(authoredValue) && isPlainObject(metaValue)) {
      // Both sides are objects — recurse so nested ref
      // placeholders (e.g. `data.saltAnnouncement.$tag` deep
      // inside a larger authored `data` block) get the same
      // protection.
      out[key] = mergeAuthoredFrontmatter(metaValue, authoredValue);
      continue;
    }

    // Scalar, array, or shape change — author wins. This is
    // the path that lets edits to `title`, `tags`, `sidebar`,
    // `layout`, etc. flow through to the preview unchanged.
    out[key] = authoredValue;
  }

  return out;
}
