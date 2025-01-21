import { ComponentPropsWithoutRef, forwardRef } from 'react';
import {
  BrandSectionHeading,
  type BrandSectionHeadingProps,
  MetricCard
} from '@jpmorganchase/mosaic-components';
import { GridLayout, StackLayout } from '@salt-ds/core';

export interface MetricSectionProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title?: BrandSectionHeadingProps['title'];
  description?: BrandSectionHeadingProps['description'];
  action?: BrandSectionHeadingProps['action'];
  metrics: { metric?: string; description?: string }[];
}

export const MetricSection = forwardRef<HTMLDivElement, MetricSectionProps>(function MetricSection(
  props,
  ref
) {
  const { title, description, metrics, action, ...rest } = props;

  return (
    <StackLayout ref={ref} {...rest}>
      {title && <BrandSectionHeading title={title} description={description} action={action} />}
      <GridLayout columns={3}>
        {metrics.map(({ metric, description }) => (
          <MetricCard key={metric} metric={metric} description={description} />
        ))}
      </GridLayout>
    </StackLayout>
  );
});
