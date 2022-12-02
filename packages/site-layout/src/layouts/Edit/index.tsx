import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const EditLayout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { pageState, stopEditing } = useContentEditor();

  useEffect(() => {
    const handleRouteChange = () => {
      if (pageState === 'EDIT') {
        stopEditing();
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [pageState, router.events, stopEditing]);

  return (
    <LayoutBase className={styles.base} Header={<AppHeader />}>
      <div id="edit-layout" className={styles.root}>
        {children}
      </div>
    </LayoutBase>
  );
};
