import { Suspense } from 'react';
import { Metadata } from 'next';
import { loadPage } from '@jpmorganchase/mosaic-loaders';

import { Body } from './Body';
import { compile } from '../../mdx/compile';

export default async function Page({ params: { slug } }) {
  const route = `/${slug.join('/')}`;
  const { source = '', data = {} } = await loadPage(route);
  const content = await compile({ source, data });

  return (
    <Suspense fallback={content}>
      <Body source={source} meta={data}>
        {content}
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
