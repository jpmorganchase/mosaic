import React, { ReactElement, ReactNode } from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { LinkCard, Text } from '@salt-ds/core';
import { ChevronRightIcon } from '@salt-ds/icons';

export interface ArticleCardProps {
  /** Additional class name for root class override. */
  className?: string;
  children?: ReactNode;
  timestamp?: string;
  title: string | ReactElement;
  link?: string;
  action?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  action = 'Read',
  className,
  children,
  title,
  timestamp,
  link,
  ...rest
}) => {
  return (
    <LinkCard className={classnames(styles.root, className)} href={link} {...rest}>
      <div className={styles.content}>
        <Text styleAs="label">{timestamp}</Text>
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
