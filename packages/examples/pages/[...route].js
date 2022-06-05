import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'
import { Callout } from '../../../../digital-platform-docs/packages/components-next/Callout';
import { Hero } from '../../../../digital-platform-docs/packages/components-next/Hero';
import { TileLink } from '../../../../digital-platform-docs/packages/components-next/TileLink';
import { PageFilterView } from '../../../../digital-platform-docs/packages/components-next/PageFilterView';
import { Tiles } from '../../../../digital-platform-docs/packages/components-next/Tiles';

export default function Home({ source }) {
  console.log(source)
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={{ Callout, TileLink, Tiles, Hero, PageFilterView }} scope={{ meta: source.frontmatter }} />
    </div>
  )
}

export async function getServerSideProps({ resolvedUrl }) {
  try {
    const source = await fetch(`http://localhost:8080${resolvedUrl}`);
    if (!source.ok) {
      throw '';
    }
    const mdxSource = await serialize(await source.text(), {
      parseFrontmatter: true
    })
    return { props: { source: mdxSource } }
  } catch {
    return {
      notFound: true,
      props: {}
    };
  }
}