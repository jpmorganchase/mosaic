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
      // React 19 narrowed `ReactElement` default props from `any` to
      // `unknown`, so spread the existing props through an explicit
      // shape before merging our additions.
      const typedChild = child as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(typedChild, {
        ...typedChild.props,
        className: styles.content
      });
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
