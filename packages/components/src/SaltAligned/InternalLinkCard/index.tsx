import React, { ReactElement, ReactNode } from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { LinkCard, Text } from '@salt-ds/core';
import { ChevronRightIcon } from '@salt-ds/icons';

export interface InternalLinkCardProps {
  /** Additional class name for root class override. */
  className?: string;
  children?: ReactNode;
  /** The title of the Hero. */
  title: string | ReactElement;
  href?: string;
  action?: string;
}

export const InternalLinkCard: React.FC<InternalLinkCardProps> = ({
  action,
  className,
  children,
  title,
  href,
  ...rest
}) => {
  return (
    <LinkCard accent="top" className={classnames(styles.root, className)} href={href} {...rest}>
      <div className={styles.content}>
        <Text styleAs="h2">{title}</Text>
        <Text>{children}</Text>
      </div>
      {action && (
        <span className={styles.action}>
          {action} <ChevronRightIcon />
        </span>
      )}
    </LinkCard>
  );
};
