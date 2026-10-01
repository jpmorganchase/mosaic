/**
 * Helpers for leaving data that a layout already sent out of a page's
 * client props.
 */

export function omitKey<T extends Record<string, unknown>>(record: T, key: string): T {
  if (!(key in record)) return record;
  const { [key]: _omitted, ...rest } = record;
  return rest as T;
}

type CompiledMdx = { frontmatter?: Record<string, unknown>; scope?: Record<string, unknown> };

/**
 * Removes `key` from a compiled MDX payload's frontmatter and from the
 * `meta` alias in its scope, without mutating the (cached) original. When
 * `meta` is the frontmatter object itself, the copy stays shared so the
 * RSC payload still serialises it once.
 */
export function withoutFrontmatterKey<T extends CompiledMdx>(source: T, key: string): T {
  const { frontmatter, scope } = source;
  if (!frontmatter || !(key in frontmatter)) return source;
  const trimmed = omitKey(frontmatter, key);
  const meta = scope?.meta as Record<string, unknown> | undefined;
  return {
    ...source,
    frontmatter: trimmed,
    ...(scope && {
      scope: {
        ...scope,
        ...(meta && { meta: meta === frontmatter ? trimmed : omitKey(meta, key) })
      }
    })
  };
}
