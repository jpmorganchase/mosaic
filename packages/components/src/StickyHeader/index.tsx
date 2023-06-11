'use client';
import React, { useRef, useState, useEffect, FC } from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export interface StickyHeaderProps {
  /** Additional class name for root class override */
  className?: string;
  /** Vertical offset in pixels, defaults to 0 */
  offset?: number;
}

export const StickyHeader: FC<React.PropsWithChildren<StickyHeaderProps>> = ({
  children,
  className,
  offset = 0,
  ...rest
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isSticky, setSticky] = useState(false);
  const offsetTop = useRef(0);

  const handleScroll = () => {
    if (rootRef.current) {
      setSticky(window.scrollY > offsetTop.current - rootRef.current.clientHeight);
    }
  };

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    offsetTop.current = rootRef.current.offsetTop;
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', () => handleScroll);
    };
  }, []);

  const style = isSticky ? { top: `${offset}px` } : undefined;
  return (
    <div
      className={classnames(styles.root, { [styles.sticky]: isSticky }, className)}
      ref={rootRef}
      role="presentation"
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
};
