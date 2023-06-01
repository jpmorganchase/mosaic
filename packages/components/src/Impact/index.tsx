'use client';

import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { useImageComponent } from '../ImageProvider';

export interface ImpactProps {
  /** Additional class name for root class override */
  className?: string;
  /* Impact image */
  image: string;
  /* Impact label */
  label: string;
  /* Impact title */
  title: React.ReactNode;
}

export const Impact: React.FC<React.PropsWithChildren<ImpactProps>> = ({
  className,
  image,
  title,
  label,
  ...rest
}: ImpactProps) => {
  const ImageComponent = useImageComponent();
  return (
    <div className={classnames(styles.root, className)} {...rest}>
      <div className={styles.line} />
      <ImageComponent className={styles.image} src={image} />
      <div>
        <p className={styles.title}>{title}</p>
        <p className={styles.label}>{label}</p>
      </div>
    </div>
  );
};
