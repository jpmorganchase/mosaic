'use client';
import React from 'react';
import { Action6, Link } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export type BackLinkProps = {
  link: string;
  label?: string;
};

export const BackLink: React.FC<BackLinkProps> = ({ label, link }) => (
  <Action6 className={styles.root}>
    <Link
      className={styles.link}
      href={link}
      endIcon="none"
      startIcon="chevronLeft"
      variant="regular"
    >
      {label ? `Back to ${label}` : 'Back'}
    </Link>
  </Action6>
);
