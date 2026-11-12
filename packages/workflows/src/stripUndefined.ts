/**
 * Recursively remove `undefined` values from a frontmatter tree
 * before it's handed to `stringifyFrontmatter` → `js-yaml`.
 *
 * Why this exists
 * ---------------
 * `gray-matter`'s `js-yaml` 3 dumper, which Mosaic used before
 * `stringifyFrontmatter`, threw `YAMLException: unacceptable kind of
 * an object to dump [object Undefined]` on the first `undefined` it
 * encountered, anywhere in the tree. `js-yaml` 4's `dump` drops
 * `undefined` object keys instead, but still writes `undefined`
 * array elements as `null`. The most common producer in the workflow
 * code is an explicit `key: undefined` injection in an object
 * spread (e.g. preserving an on-disk-derived `fullPath` that
 * happens not to be set yet) — `key in object` is true and the value
 * is undefined. Stripping first keeps the saved YAML free of values
 * the author never wrote.
 *
 * Semantics
 * ---------
 *   - Plain-object keys with `value === undefined` are dropped.
 *   - Arrays preserve order; `undefined` array elements are
 *     dropped (YAML has no spelling for "explicit absence in a
 *     sequence", and `null` would be a semantically different
 *     value than the author likely meant).
 *   - `null`, `''`, `0`, `false`, `Date`, etc. are preserved
 *     verbatim — they're all legitimate YAML scalars.
 *   - Non-plain objects (instances of user-defined classes, Maps,
 *     Sets, etc.) are passed through unchanged; `js-yaml` will
 *     either tag them or reject them on its own terms, which is
 *     the correct behaviour for those.
 *
 * Shared by the Bitbucket and GitHub PR workflows; both
 * historically constructed `nextMeta = { ...parsed, fullPath:
 * meta.fullPath }` which crashed when `meta.fullPath` was
 * undefined (e.g. during a brand-new page save before the
 * filesystem coordinate was stamped).
 */
export function stripUndefined(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const cleaned = stripUndefined(item);
      if (cleaned !== undefined) out.push(cleaned);
    }
    return out;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}
