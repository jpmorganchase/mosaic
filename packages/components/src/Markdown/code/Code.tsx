import React from 'react';
import classnames from 'clsx';

import styles from './Code.module.css';

export interface CodeProps extends React.HTMLProps<HTMLPreElement> {}

export const Code: React.FC<React.PropsWithChildren<CodeProps>> = ({ className, ...rest }) => (
  <code className={classnames(className, styles.code)} {...rest} />
);
