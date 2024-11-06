import { ReactNode, Ref, forwardRef } from 'react';
import classnames from 'clsx';

import styles from './ScrollableSection.css';

interface ScrollableSectionProps {
  className?: string;
  children: ReactNode;
}

export const ScrollableSection = forwardRef(function ScrollableSection(
  { className, children }: ScrollableSectionProps,
  ref: Ref<HTMLDivElement>
) {
  return (
    <section ref={ref} className={classnames(styles.root, className)}>
      {children}
    </section>
  );
});
