import { compileMDX } from 'next-mdx-remote/rsc';
import nodeFetch from 'node-fetch';

const mosaicComponents = await import('@jpmorganchase/mosaic-components');

export default async function Home(props) {
  const { params } = props;
  const url = `http://localhost:8080/${params.slug.join('/')}`;
  const res = await nodeFetch(url);
  const source = await res.text();

  const { content } = await compileMDX({
    source,
    components: mosaicComponents,
    options: { parseFrontmatter: true }
  });
  return content;
}
