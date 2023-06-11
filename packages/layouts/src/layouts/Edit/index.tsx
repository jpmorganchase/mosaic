import React from 'react';
import { useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { AppHeader, NavigationEvents } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const EditLayout: React.FC<LayoutProps> = ({ children }) => {
  const { pageState, stopEditing } = useContentEditor();
  const handleRouteChange = () => {
    if (pageState === 'EDIT') {
      stopEditing();
    }
  };
  return (
    <>
      <NavigationEvents onRouteChange={handleRouteChange()} />
      <LayoutBase className={styles.base} Header={<AppHeader />}>
        <div id="edit-layout" className={styles.root}>
          {children}
        </div>
      </LayoutBase>
    </>
  );
};
