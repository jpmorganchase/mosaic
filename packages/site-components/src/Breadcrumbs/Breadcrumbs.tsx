import React from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs as SaltBreadcrumbs } from '@salt-ds/lab';
import { Breadcrumb } from './Breadcrumb';

import styles from './styles.css';

export type BreadcrumbProps = {
  id: string;
  label: string;
  path: string;
};

export type BreadcrumbsProps = {
  breadcrumbs: BreadcrumbProps[];
  enabled: boolean;
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, enabled }) => {
  const router = useRouter();
  if (!enabled) {
    return null;
  }

  /**
   * TODO - we need appropriate keyboard nav support as well
   * The slat cascading menu keyboard nav does not seem to work
   * so not much point adding support for enter key selection here
   */
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    if (target.classList.contains('saltMenuItem-menuItemText')) {
      const breadcrumbIndex = breadcrumbs.findIndex(
        breadcrumb => breadcrumb.label.toLowerCase() === target.textContent?.toLowerCase()
      );

      if (breadcrumbIndex > -1) {
        router.push(breadcrumbs[breadcrumbIndex].path);
      }
    }
  };

  return (
    <div onClick={handleClick}>
      <SaltBreadcrumbs className={styles.root} itemsBeforeCollapse={2} maxItems={5}>
        {breadcrumbs.map(
          value =>
            value && (
              <Breadcrumb href={value.path} key={`${value.id}`} overflowLabel={value.label}>
                {value.label}
              </Breadcrumb>
            )
        )}
      </SaltBreadcrumbs>
    </div>
  );
};
