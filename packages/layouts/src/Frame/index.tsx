'use client';

import type { ReactNode } from 'react';

import styles from '../LayoutBase/styles.css';

// Compatibility paths share the exact context exported by the neutral store package.
export { FrameProvider, useFrame, type FrameValue } from '@jpmorganchase/mosaic-store/frame';

/** Sticky header chrome for hosts with a persistent frame. */
export function LayoutHeader({ children }: { children?: ReactNode }) {
  return <header className={styles.header}>{children}</header>;
}
