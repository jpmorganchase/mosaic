import React from 'react';
import classnames from 'classnames';
import { ContentStatus } from '@salt-ds/lab';

import styles from './styles.css';

export interface FilterNoResultsProps {
  /** Additional class name for root class override */
  className?: string;
}

export function DefaultNoResults() {
  return <ContentStatus message="No Results Found" status="info" />;
}

export const FilterNoResults: React.FC<React.PropsWithChildren<FilterNoResultsProps>> = ({
  children,
  className
}): React.ReactElement => <div className={classnames(className, styles.root)}>{children}</div>;
