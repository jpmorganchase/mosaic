import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

import options from './plugins/prettyCode';

export async function compileMDX(
  content,
  parseFrontmatter = true,
  rehypePlugins = [],
  remarkPlugins = []
) {
  const mdxSource = await serialize(content, {
    mdxOptions: {
      rehypePlugins: [rehypeSlug, [rehypePrettyCode, options], ...rehypePlugins],
      remarkPlugins: [remarkGfm, ...remarkPlugins]
    },
    parseFrontmatter
  });
  return mdxSource;
}
