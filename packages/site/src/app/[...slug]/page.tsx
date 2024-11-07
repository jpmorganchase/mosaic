import { Suspense } from 'react';
import { Metadata } from 'next';
import { loadPage } from '@jpmorganchase/mosaic-loaders';

import { type PreviewAction, preview } from '@jpmorganchase/mosaic-site-components-next';
import { MDXContent, mdxComponents } from '@jpmorganchase/mosaic-site-components-next';

import { Body } from './Body';

const previewAction: PreviewAction = async options => {
  'use server';

  return preview({ ...options, components: mdxComponents });
};

export default async function Page({ params: { slug } }) {
  const route = `/${slug.join('/')}`;
  const { source = '', data = {} } = await loadPage(route);

  return (
    <Suspense fallback={null}>
      <Body source={source} meta={data} previewAction={previewAction}>
        <MDXContent source={source} data={data} components={mdxComponents} />
      </Body>
    </Suspense>
  );
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
