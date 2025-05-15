import React from 'react';
import { Card as SaltCard, Text } from '@salt-ds/core';
import classnames from 'clsx';
import styles from './Card.module.css';

/**
 * The props type for [[`Card`]].
 */
export interface CardProps {
  /** The content of the card. */
  children: React.ReactNode;
  /** Additional class name for root class override. */
  className?: string;
  /** The step of the card. */
  step: string;
  /** The title of the card. */
  title: string;
}

/**
 * Renders a card. Cards are used to create a list of steps.
 * @example
 * ```tsx
 *   <Card step="01" title="Create">
 *    Starting with foundations and frameworks, create apps that leverage a common architecture to
 *    make your build easier.
 *   </Card>
 *```
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  step,
  title,
  ...rest
}: CardProps) => (
  <SaltCard className={classnames(className, styles.container)} {...rest}>
    {step !== undefined ? (
      <Text styleAs={'h2'} className={styles.step}>
        {step}
      </Text>
    ) : null}
    <Text styleAs={'h3'} className={styles.title}>
      {title}
    </Text>
    <div className={styles.content}>{children}</div>
  </SaltCard>
);
