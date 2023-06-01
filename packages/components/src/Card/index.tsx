'use client';

import React from 'react';

import styles from './styles.css';

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
export const Card: React.FC<CardProps> = ({ children, step, title, ...rest }: CardProps) => (
  <div {...rest}>
    <p className={styles.step}>{step}</p>
    <p className={styles.title}>{title}</p>
    <div className={styles.content}>{children}</div>
  </div>
);
