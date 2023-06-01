import nodeFetch from 'node-fetch';
import { headers } from 'next/headers';

import '@jpmorganchase/mosaic-site-preset-styles/index.css';
import { themeClassName } from '@jpmorganchase/mosaic-theme';

const layouts = {
  default: ({ children }) => <div>FULLWIDTH{children}</div>,
  Landing: ({ children }) => <div>LANDING{children}</div>,
  DetailTechnical: ({ children }) => <div>DETAILTECHNICAL{children}</div>
};

export default async function Layout({ children }) {
  const pathname = headers().get('x-next-pathname') as string;
  const url = `http://localhost:3000/api/${pathname}`;
  const res = await nodeFetch(url);
  const { frontmatter } = await res.json();

  const LayoutComponent = layouts[frontmatter.layout];
  return (
    <section className={themeClassName}>
      <LayoutComponent>{children}</LayoutComponent>
    </section>
  );
}
