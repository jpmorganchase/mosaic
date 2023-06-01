'use client';

import React from 'react';
import classnames from 'clsx';
import { Icon } from '../Icon';
import { Caption1 } from '../Typography';

import { Link } from '../Link';
import styles from './styles.css';

export interface HelpLinkDescriptor {
  label: string;
  link: string;
}

/**
 * The HelpLinksProps interface.
 */
export interface HelpLinksProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The URL to link to when the Stack Overflow link is clicked. */
  stackoverflowLabel?: string;
  /** The label of the Stack Overflow link. */
  stackoverflowUrl?: string;
  /** An optional title above the links. */
  subTitle?: string;
  /** The label of the Symphony link. */
  symphonyLabel?: string;
  /** The URL to link to when the Symphony link is clicked. */
  symphonyUrl?: string;
  links?: Array<HelpLinkDescriptor>;
}

/**
 * Renders a HelpLinks component. This component is used to create Stack Overflow and Symphony help links.
 * @example
 * ```tsx
 * <HelpLinks
 *   stackoverflowUrl="https://stackexchange.com/some/url"
 *   symphonyUrl="symhony://some/url"
 * />
 * ```
 */
export const HelpLinks: React.FC<React.PropsWithChildren<HelpLinksProps>> = ({
  className,
  stackoverflowLabel = 'Stack Overflow',
  stackoverflowUrl,
  subTitle,
  symphonyLabel = 'Symphony',
  symphonyUrl,
  links = []
}) => (
  <div className={classnames(className, styles.root)}>
    {subTitle && <Caption1>{subTitle}</Caption1>}
    {stackoverflowUrl && (
      <Link className={styles.link} link={stackoverflowUrl} variant="component">
        <Icon className={classnames(styles.startAdornment)} name="stackoverflow" />
        {stackoverflowLabel}
        <Icon className={classnames(styles.endAdornment)} name="tearOut" />
      </Link>
    )}
    {symphonyUrl && (
      <Link className={styles.link} link={symphonyUrl} variant="component">
        <Icon className={classnames(styles.startAdornment)} name="symphony" />
        {symphonyLabel}
        <Icon className={classnames(styles.endAdornment)} name="tearOut" />
      </Link>
    )}
    {links.map((descriptor: HelpLinkDescriptor) => (
      <Link
        key={descriptor.link}
        className={styles.link}
        link={descriptor.link}
        variant="component"
      >
        {descriptor.label}
        <Icon className={classnames(styles.endAdornment)} name="tearOut" />
      </Link>
    ))}
  </div>
);
