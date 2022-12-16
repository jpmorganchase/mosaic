import React from 'react';
import { Breadcrumbs as UITKBreadcrumbs } from '@salt-ds/lab';
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
  if (!enabled) {
    return null;
  }

  return (
    <UITKBreadcrumbs className={styles.root} itemsBeforeCollapse={2} maxItems={5}>
      {breadcrumbs.map(
        (value, index) =>
          value && (
            <Breadcrumb href={value.path} key={`${value.id}-${index}`} overflowLabel={value.label}>
              {value.label}
            </Breadcrumb>
          )
      )}
    </UITKBreadcrumbs>
  );
};
