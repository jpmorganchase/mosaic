import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { codeBlocks } from './plugins/codeBlocks.js';

export async function compileMDX(
  content,
  parseFrontmatter = true,
  rehypePlugins = [],
  remarkPlugins = []
) {
  const mdxSource = await serialize(content, {
    blockJS: true,
    blockDangerousJS: true,
    mdxOptions: {
      rehypePlugins: [codeBlocks, rehypeSlug, ...remarkPlugins],
      remarkPlugins: [remarkGfm, ...rehypePlugins]
    },
    parseFrontmatter
  });
  return mdxSource;
}
