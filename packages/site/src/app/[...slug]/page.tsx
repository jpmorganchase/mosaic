import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import components from '@jpmorganchase/mosaic-mdx-components-server';
import { getPage } from '../../utils/getPage';

export default async function Page({ params }) {
  const pathname = params.slug.join('/');
  if (!pathname) {
    return null;
  }
  const { source, data } = await getPage(pathname);

  const { content } = await compileMDX({
    source,
    components,
    options: {
      scope: { meta: data },
      mdxOptions: {
        rehypePlugins: [rehypeSlug],
        remarkPlugins: [remarkGfm]
      },
      parseFrontmatter: true
    }
  });
  return content;
}
