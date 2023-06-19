import React from 'react';
import classnames from 'clsx';

import { P2 } from '@jpmorganchase/mosaic-components';
import styles from './index.css';

export interface BlockQuoteProps extends React.HTMLProps<HTMLDivElement> {}

export const BlockQuote: React.FC<React.PropsWithChildren<BlockQuoteProps>> = ({
  children,
  className
}) => {
  const rawChildren =
    React.isValidElement(children) && children.props ? children.props.children : children;
  return (
    <div className={classnames(className, styles.root)}>
      <div className={styles.watermark} />
      <P2>{rawChildren}</P2>
    </div>
  );
};
