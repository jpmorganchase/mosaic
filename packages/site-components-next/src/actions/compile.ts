import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode, { type Options } from 'rehype-pretty-code';
import type { MDXComponents } from 'mdx/types';
import type { SiteState } from '@jpmorganchase/mosaic-loaders';

const defaultLangPrettyCodeOptions: Partial<Options> = {
  theme: { dark: 'night-owl', light: 'light-plus' },
  defaultLang: 'js',
  keepBackground: false
};

export type CompileOptions = {
  source: string;
  components: MDXComponents;
  data?: Partial<SiteState>;
  rehypePlugins?: any[];
  remarkPlugins?: any[];
  parseFrontmatter?: boolean;
  prettyCodeOptions?: Options;
};

export async function compile({
  source,
  data = {},
  components,
  rehypePlugins = [],
  remarkPlugins = [],
  parseFrontmatter = false,
  prettyCodeOptions = defaultLangPrettyCodeOptions
}: CompileOptions) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      scope: { meta: data },
      mdxOptions: {
        rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions], ...rehypePlugins],
        remarkPlugins: [remarkGfm, ...remarkPlugins]
      },
      parseFrontmatter
    }
  });

  return content;
}

export type CompileAction = typeof compile;
