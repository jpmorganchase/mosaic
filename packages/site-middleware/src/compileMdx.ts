/**
 * Thin wrapper around `next-mdx-remote-client/serialize` used by the
 * `/api/content/preview` editor endpoint, which expects the legacy
 * `{ compiledSource, frontmatter, scope }` shape.
 *
 * For new code prefer `serializeMdxForClient` (same engine, same output
 * shape, plus the Mosaic-specific `meta` scope injection).
 */
import { serialize } from 'next-mdx-remote-client/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { codeBlocks } from './plugins/codeBlocks.js';

export async function compileMDX(
  content: string,
  parseFrontmatter = true,
  rehypePlugins: any[] = [],
  remarkPlugins: any[] = []
) {
  const result = await serialize({
    source: content,
    options: {
      parseFrontmatter,
      mdxOptions: {
        // `codeBlocks` first, then `rehypeSlug`, with caller-supplied
        // plugins appended. Note the original signature swapped the
        // `rehype` / `remark` argument names — we preserve that quirk
        // for backwards compatibility.
        rehypePlugins: [codeBlocks as any, rehypeSlug as any, ...remarkPlugins],
        remarkPlugins: [remarkGfm as any, ...rehypePlugins]
      }
    }
  });
  return result;
}
