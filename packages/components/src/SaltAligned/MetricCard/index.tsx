import React from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { Card, Text } from '@salt-ds/core';

export interface MetricCardProps {
  /** Additional class name for root class override. */
  className?: string;
  metric?: string;
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  className,
  metric,
  description,
  ...rest
}) => {
  return (
    <Card className={classnames(styles.root, className)} {...rest}>
      <Text styleAs="display3">{metric}</Text>
      <Text>{description}</Text>
    </Card>
  );
};
