import { H3 } from '@salt-ds/core';
import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import styles from './Heading3.module.css';
import classnames from 'clsx';

interface Heading3Props extends Omit<ComponentPropsWithoutRef<'h3'>, 'color'> {
  children: ReactNode;
  id?: string;
}

export const Heading3: FC<Heading3Props> = ({ children, className, ...rest }) => (
  <H3 className={classnames(className, styles.heading3)} data-mdx="heading3" {...rest}>
    {children}
  </H3>
);
