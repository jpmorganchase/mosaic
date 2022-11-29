import { withMarkdownSpacing } from '../Markdown/withMarkdownSpacing';
import { Diagram } from './Diagram';
import { Sitemap } from './Sitemap';
import type { SitemapProps } from './Sitemap';
import type { DiagramProps } from './Diagram';

export * from './Diagram';
export * from './Sitemap';

export const getLabMarkdownComponents = () => ({
  Diagram: withMarkdownSpacing<DiagramProps>(Diagram),
  Sitemap: withMarkdownSpacing<SitemapProps>(Sitemap)
});
