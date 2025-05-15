import { H1 } from '@salt-ds/core';
import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import styles from './Heading1.module.css';
import classnames from 'clsx';

interface Heading1Props extends Omit<ComponentPropsWithoutRef<'h1'>, 'color'> {
  children: ReactNode;
  id?: string;
}
export const Heading1: FC<Heading1Props> = ({ children, className, ...rest }) => (
  <H1 className={classnames(className, styles.heading1)} data-mdx="heading1" {...rest}>
    {children}
  </H1>
);
