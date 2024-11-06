import { forwardRef, ReactNode } from 'react';
import { Icon, Link } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export interface BreadcrumbProps {
  children?: ReactNode;
  href?: string;
  isCurrentLevel?: boolean;
  hideSeparator?: boolean;
}

export const Breadcrumb = forwardRef<HTMLAnchorElement, BreadcrumbProps>(function Breadcrumb(
  { children, isCurrentLevel, href, hideSeparator },
  ref
) {
  return (
    <li className={styles.breadcrumb}>
      {isCurrentLevel ? (
        <>
          {!hideSeparator && <Icon name="chevronRight" aria-hidden />}
          <span>{children}</span>
        </>
      ) : (
        <>
          <Link endIcon="none" ref={ref} variant="regular" href={href}>
            {children}
          </Link>
          {!hideSeparator && <Icon name="chevronRight" aria-hidden />}
        </>
      )}
    </li>
  );
});
