import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import { Accordion } from '../../../../digital-platform-docs/packages/components-next/Accordion';
import { Callout } from '../../../../digital-platform-docs/packages/components-next/Callout';
import { Link } from '../../../../digital-platform-docs/packages/components-next/Link';
import { Hero } from '../../../../digital-platform-docs/packages/components-next/Hero';
import { TileLink } from '../../../../digital-platform-docs/packages/components-next/TileLink';
import { PageFilterView } from '../../../../digital-platform-docs/packages/components-next/PageFilterView';
import { Tiles } from '../../../../digital-platform-docs/packages/components-next/Tiles';

const components = { Accordion, Callout, TileLink, Tiles, Hero, Link, PageFilterView };

export default function Index({ type, ...props }) {
  if (type === 'mdx') {
    return (
      <div className="wrapper">
        <MDXRemote {...props.source} components={components} scope={{ meta: props.source.frontmatter }} />
      </div>
    );
  }
  // If file is JSON, we expect it to have a `content` attr
  if (type === 'json') {
    return (
      <div className="wrapper">
        {props.content}
      </div>
    );
  }
  return (<div className="wrapper">Unsupported file type</div>);
}

export async function getServerSideProps({ resolvedUrl }) {
  try {
    const req = await fetch(`http://localhost:8080${resolvedUrl}`);
    if (req.ok) {
      if (req.headers.get('content-type').includes('/mdx')) {
        const text = await req.text();
        const mdxSource = await serialize(text, {
          parseFrontmatter: true
        })
        return { props: { type: 'mdx', source: mdxSource } }
      } else if (req.headers.get('content-type').includes('/json')) {
        const json = await req.json();
        return { props: { type: 'json', ...json } }
      }
      // If redirect url was returned
    } else if (req.status === 302) {
      return {
        redirect: {
          destination: (await req.json()).redirect,
          permanent: true
        }
      }
    }
  } catch { }
  return {
    notFound: true,
    props: {}
  };
}