import type { ReactNode } from 'react';

import styles from './styles.css';

export interface EditLayoutProps {
  children: ReactNode;
}

export const Edit = ({ children }: EditLayoutProps) => (
  <div id="edit-layout" className={styles.root}>
    {children}
  </div>
);
