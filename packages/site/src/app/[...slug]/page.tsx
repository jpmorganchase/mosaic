import { headers } from 'next/headers';
import { compileMDX } from 'next-mdx-remote/rsc';
import { Card, Cards, Hero } from '@jpmorganchase/mosaic-components';

import { getPage } from '../../utils/getPage';

export default async function Page() {
  const pathname = headers().get('x-next-pathname') as string;
  if (!pathname) {
    return null;
  }
  const { source, frontmatter } = await getPage(pathname);

  const { content } = await compileMDX({
    source,
    components: { Card, Cards, Hero },
    options: { scope: { meta: frontmatter }, parseFrontmatter: true }
  });
  return content;
}
