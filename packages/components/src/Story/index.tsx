'use client';
import React from 'react';
import classnames from 'clsx';

import { LinkButton } from '../LinkButton';
import { useImageComponent } from '../ImageProvider';
import styles from './styles.css';

export interface StoryProps {
  /* Root classname override */
  className?: string;
  /* Rich text content */
  children: React.ReactNode;
  /* Link to further resources */
  link?: string;
  /* Link text */
  linkText?: string;
  /* Subtitle */
  subtitle?: string;
  /* Title */
  title?: string;
  /* Image URL */
  image?: string;
  /* Variant a primary is intended to be used for the first Story on a page  */
  variant?: 'primary' | 'secondary';
}

export const Story: React.FC<StoryProps> = ({
  className,
  children,
  image,
  link,
  linkText = 'Read More',
  subtitle,
  title,
  variant = 'secondary'
}) => {
  const ImageComponent = useImageComponent();

  return (
    <div className={classnames(styles.root, className)}>
      {title ? (
        <h1
          className={classnames({
            [styles.primaryHeading]: variant === 'primary',
            [styles.secondaryHeading]: variant === 'secondary'
          })}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <h2
          className={classnames({
            [styles.primarySubtitle]: variant === 'primary',
            [styles.secondarySubtitle]: variant === 'secondary'
          })}
        >
          {subtitle}
        </h2>
      ) : null}
      {image ? <ImageComponent className={styles.image} src={image} /> : null}
      {children}
      {link ? (
        <LinkButton aria-label="Read more about article" className={styles.readMore} href={link}>
          {linkText}
        </LinkButton>
      ) : null}
    </div>
  );
};
