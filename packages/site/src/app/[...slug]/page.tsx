import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import components from '@jpmorganchase/mosaic-mdx-components-server';
import { loadPage } from '@jpmorganchase/mosaic-site-mdx-loader';

export default async function Page({ params: { slug } }) {
  const route = `/${slug.join('/')}`;
  const { source = '', data = {} } = await loadPage(route);
  const { content } = await compileMDX({
    source,
    components,
    options: {
      scope: { meta: data },
      mdxOptions: {
        rehypePlugins: [rehypeSlug],
        remarkPlugins: [remarkGfm]
      },
      parseFrontmatter: false
    }
  });
  return content;
}

export async function generateStaticParams() {
  const generateStaticParamsURL = process.env.GENERATE_STATIC_PARAMS_URL;
  if (generateStaticParamsURL) {
    const pages = await fetch(generateStaticParamsURL).then(res => res.json());
    return pages.map(({ route }) => ({
      slug: route.substring(1).split('/')
    }));
  }
  return [];
}
