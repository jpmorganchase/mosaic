import { ComponentPropsWithoutRef, forwardRef } from 'react';
import {
  ArticleCard,
  BrandSectionHeading,
  type BrandSectionHeadingProps
} from '@jpmorganchase/mosaic-components';
import { GridLayout, StackLayout } from '@salt-ds/core';

export interface ArticlesSectionProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title?: BrandSectionHeadingProps['title'];
  description?: BrandSectionHeadingProps['description'];
  action?: BrandSectionHeadingProps['action'];
  articles: { timestamp: string; title: string; preview: string; link: string }[];
}

export const ArticlesSection = forwardRef<HTMLDivElement, ArticlesSectionProps>(
  function ArticlesSection(props, ref) {
    const { title, description, articles, action, ...rest } = props;

    return (
      <StackLayout ref={ref} {...rest}>
        {title && <BrandSectionHeading title={title} description={description} action={action} />}
        <GridLayout columns={3}>
          {articles.map(({ timestamp, title, preview, link }) => (
            <ArticleCard key={title} timestamp={timestamp} title={title} link={link}>
              {preview}
            </ArticleCard>
          ))}
        </GridLayout>
      </StackLayout>
    );
  }
);
