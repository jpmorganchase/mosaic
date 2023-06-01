import { NextResponse } from 'next/server';
import nodeFetch from 'node-fetch';
import { compileMDX } from 'next-mdx-remote/rsc';

const mosaicComponents = await import('@jpmorganchase/mosaic-components');

export async function GET(_request: Request, { params }) {
  const { slug } = params;
  const route = slug.join('/');
  const url = `http://localhost:8080/${route}`;
  const res = await nodeFetch(url);
  const source = await res.text();
  const { frontmatter } = await compileMDX({
    source,
    components: mosaicComponents,
    options: { parseFrontmatter: true }
  });
  return NextResponse.json({ frontmatter });
}
