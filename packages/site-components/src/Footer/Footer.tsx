import React from 'react';
import classnames from 'classnames';
import { HelpLinks, LinkButton, H6, P2 } from '@jpmorganchase/mosaic-components';
import type { LinkIconProps } from '@jpmorganchase/mosaic-components';
import styles from './styles.css';

export interface FooterProps {
  className?: string;
  description?: string;
  helpLinks?: {
    stackoverflowLabel: string;
    stackoverflowUrl: string;
    symphonyLabel: string;
    symphonyUrl: string;
  };
  href?: string;
  label?: string;
  iconProps?: LinkIconProps;
  title?: string;
}

export const Footer: React.FC<FooterProps> = ({
  className,
  description,
  helpLinks,
  title,
  href,
  label
}) => (
  <footer className={classnames(styles.root, className)}>
    <div className={styles.content}>
      {title && <H6 className={styles.title}>{title}</H6>}
      {description && <P2 className={styles.description}> {description}</P2>}
      {label && href && (
        <div className={styles.button}>
          <LinkButton href={href}>{label}</LinkButton>
        </div>
      )}
    </div>

    {helpLinks && (
      <div className={styles.links}>
        {helpLinks ? <HelpLinks subTitle="Need Help?" {...helpLinks} /> : null}
      </div>
    )}
  </footer>
);
