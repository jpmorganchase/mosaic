import { forwardRef, ReactNode } from 'react';
import { Link } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export interface BreadcrumbProps {
  children?: ReactNode;
  href?: string;
  isCurrentLevel?: boolean;
  overflowLabel?: string;
}

// TODO replace with Salt Breadcrumb when it supports an API that can customize Links
export const Breadcrumb = forwardRef<HTMLLinkElement, BreadcrumbProps>(function Breadcrumb(
  { children, isCurrentLevel, overflowLabel, ...props },
  ref
) {
  return (
    <li className={styles.wrapper}>
      {isCurrentLevel ? (
        <span>{children}</span>
      ) : (
        <Link endIcon="none" ref={ref} variant="regular" {...props}>
          {children}
        </Link>
      )}
    </li>
  );
});
