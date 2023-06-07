import { Metadata } from 'next';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { mdxComponents } from '@jpmorganchase/mosaic-site-components-next';
import { loadPage } from '@jpmorganchase/mosaic-loaders';
import type { MDXProvider } from '@mdx-js/react';
import type { ComponentProps } from 'react';

const components = mdxComponents as unknown as ComponentProps<typeof MDXProvider>['components'];

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

export async function generateMetadata({ params: { slug } }): Promise<Metadata> {
  const route = `/${slug.join('/')}`;
  const { data = {} } = await loadPage(route);

  return {
    title: data.title,
    description: data.description
  };
}
