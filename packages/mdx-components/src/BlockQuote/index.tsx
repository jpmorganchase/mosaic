import React from 'react';
import classnames from 'clsx';
import styles from './index.css';

export interface BlockQuoteProps extends React.HTMLProps<HTMLDivElement> {}

export const BlockQuote: React.FC<React.PropsWithChildren<BlockQuoteProps>> = ({
  children,
  className
}) => {
  const styledChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { ...child.props, className: styles.content });
    }
    return child;
  });
  return (
    <blockquote className={classnames(className, styles.root)}>
      <div className={styles.watermark} />
      {styledChildren}
    </blockquote>
  );
};
