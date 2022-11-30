import { TooltipProps } from '@jpmorganchase/uitk-core';
import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { Link } from '@jpmorganchase/mosaic-components';

export interface BreadcrumbProps {
  children?: ReactNode;
  href?: string;
  isCurrentLevel?: boolean;
}

// TODO replace with Odyssey Breadcrumb when it supports an API that can customize Links
export const Breadcrumb = forwardRef<HTMLLIElement, BreadcrumbProps>(function Breadcrumb(
  { children, isCurrentLevel, ...props },
  ref
) {
  return isCurrentLevel ? (
    <span>{children}</span>
  ) : (
    <Link endIcon="none" ref={ref} variant="regular" {...props}>
      {children}
    </Link>
  );
});
