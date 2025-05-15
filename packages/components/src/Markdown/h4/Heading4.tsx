import { H4 } from '@salt-ds/core';
import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react';
import styles from './Heading4.module.css';
import classnames from 'clsx';

interface Heading4Props extends Omit<ComponentPropsWithoutRef<'h4'>, 'color'> {
  children: ReactNode;
  id?: string;
}

export const Heading4: FC<Heading4Props> = ({ children, className, ...rest }) => (
  <H4 className={classnames(className, styles.heading4)} data-mdx="heading4" {...rest}>
    {children}
  </H4>
);
