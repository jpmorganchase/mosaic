import React, { ReactElement } from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { Card, H3, Text } from '@salt-ds/core';
import { LinkBase } from '../../LinkBase';

export interface SignUpSectionProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The content of the Hero. */
  description?: string | ReactElement;
  /** The title of the Hero. */
  title: string | ReactElement;
  link: {
    label: string;
    url: string;
  };
}

export const SignUpSection: React.FC<SignUpSectionProps> = ({
  className,
  description,
  title,
  link,
  ...rest
}) => {
  return (
    <Card className={classnames(styles.root, className)} {...rest}>
      <H3>{title}</H3>
      <Text>{description}</Text>
      {link && (
        <LinkBase className={styles.link} key={link.label} href={link.url}>
          {link.label}
        </LinkBase>
      )}
    </Card>
  );
};
