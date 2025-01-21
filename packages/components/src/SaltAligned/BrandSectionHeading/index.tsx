import React, { ReactNode } from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { Text, H2 } from '@salt-ds/core';
import { Link } from '../../Link';

export interface BrandSectionHeadingProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The title of the Hero. */
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    url: string;
  };
}

export const BrandSectionHeading: React.FC<BrandSectionHeadingProps> = ({
  action,
  className,
  title,
  description,
  ...rest
}) => {
  return (
    <div className={classnames(styles.root, className)} {...rest}>
      <div className={styles.content}>
        <H2 styleAs="display4">{title}</H2>
        {description && <Text>{description}</Text>}
      </div>
      {action && (
        <Link className={styles.action} href={action.url}>
          {action.label}
        </Link>
      )}
    </div>
  );
};
