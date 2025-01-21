import { ComponentPropsWithoutRef, forwardRef, ReactNode } from 'react';
import {
  BrandSectionHeading,
  type BrandSectionHeadingProps,
  InternalLinkCard
} from '@jpmorganchase/mosaic-components';
import { GridLayout, StackLayout } from '@salt-ds/core';

export interface QuickLinksProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title?: BrandSectionHeadingProps['title'];
  description?: BrandSectionHeadingProps['description'];
  links: { title: string; preview?: ReactNode; url: string; action?: string }[];
}

export const QuickLinks = forwardRef<HTMLDivElement, QuickLinksProps>(function QuickLinks(
  props,
  ref
) {
  const { title, description, links, ...rest } = props;

  return (
    <StackLayout ref={ref} {...rest}>
      {title && <BrandSectionHeading title={title} description={description} />}
      <GridLayout columns={4}>
        {links.map(({ url, action = 'Link', title, preview }) => (
          <InternalLinkCard key={title} href={url} action={action} title={title}>
            {preview}
          </InternalLinkCard>
        ))}
      </GridLayout>
    </StackLayout>
  );
});
