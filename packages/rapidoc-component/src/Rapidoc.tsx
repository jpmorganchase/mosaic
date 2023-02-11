/**
 * Keep this separate.
 * We want this to be loaded on the client and not the server to prevent
 * issues with rapidoc dependencies.
 */
import React from 'react';
import classnames from 'classnames';
import 'rapidoc';
import { useColorMode } from '@jpmorganchase/mosaic-store';

import styles from './index.css';
const Rapidoc = ({ className, ...rest }) => {
  const colorMode = useColorMode();
  return (
    <rapi-doc
      className={classnames(styles.root, className)}
      render-style={'focused'}
      show-header={false}
      theme={colorMode}
      {...rest}
    />
  );
};
export default Rapidoc;
