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
    mdxOptions: {
      rehypePlugins: [rehypeSlug, ...remarkPlugins],
      remarkPlugins: [codeBlocks, remarkGfm, ...rehypePlugins]
    },
    parseFrontmatter
  });
  return mdxSource;
}
