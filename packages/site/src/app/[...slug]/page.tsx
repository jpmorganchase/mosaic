import { useStore } from '@jpmorganchase/mosaic-store';
import { compileMDX } from 'next-mdx-remote/rsc';
import { Card, Cards, Hero } from '@jpmorganchase/mosaic-components';

export default async function Page() {
  const { source, ...frontmatter } = useStore.getState();
  if (!source) {
    return null;
  }
  const { content } = await compileMDX({
    source,
    components: { Card, Cards, Hero },
    options: { scope: { meta: frontmatter }, parseFrontmatter: true }
  });
  return content;
}
