import React from 'react';
import classnames from 'clsx';
import { Text, StatusIndicator, StackLayout } from '@salt-ds/core';

import styles from './styles.css';

export interface FilterNoResultsProps {
  /** Additional class name for root class override */
  className?: string;
}

export function DefaultNoResults() {
  return (
    <StackLayout gap={3} align="center">
      <StatusIndicator status="info" size={2} />
      <Text>No Results Found</Text>
    </StackLayout>
  );
}

export const FilterNoResults: React.FC<React.PropsWithChildren<FilterNoResultsProps>> = ({
  children,
  className
}): React.ReactElement => <div className={classnames(className, styles.root)}>{children}</div>;
