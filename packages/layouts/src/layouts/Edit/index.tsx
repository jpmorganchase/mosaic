'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const EditLayout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { pageState, stopEditing } = useContentEditor();
  const previousPathname = useRef(pathname);

  // Stop editing when the route changes. App Router does not surface a
  // "navigation start" event, but firing on pathname *change* (i.e.
  // after navigation completes) is sufficient for the editor: it
  // prevents the editor from staying open across pages.
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      if (pageState === 'EDIT') {
        stopEditing();
      }
    }
  }, [pathname, pageState, stopEditing]);

  return (
    <LayoutBase className={styles.base} Header={<AppHeader />}>
      <div id="edit-layout" className={styles.root}>
        {children}
      </div>
    </LayoutBase>
  );
};
