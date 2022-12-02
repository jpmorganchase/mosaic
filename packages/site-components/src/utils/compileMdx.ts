import { serialize } from 'next-mdx-remote/serialize';
import rehypeSlug from 'rehype-slug';
import { codeBlocks } from '../plugins/codeBlocks';

export async function compileMDX(
  content,
  parseFrontmatter = true,
  rehypePlugins = [],
  remarkPlugins = []
) {
  const mdxSource = await serialize(content, {
    mdxOptions: {
      rehypePlugins: [rehypeSlug, ...remarkPlugins],
      remarkPlugins: [codeBlocks, ...rehypePlugins]
    },
    parseFrontmatter
  });
  return mdxSource;
}
