import React from 'react';
import classnames from 'clsx';
import styles from './styles.css';
import { TextNotation, Text } from '@salt-ds/core';
import { Link } from '@jpmorganchase/mosaic-components';

export interface BrandFooterProps {
  className?: string;
  copyright?: string;
  sitemap?: any;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({ className, copyright, sitemap }) => (
  <footer className={classnames(styles.root, className)}>
    {sitemap && (
      <div className={styles.sitemap}>
        {sitemap.map(section => (
          <div className={styles.sitemapSection} key={section.title}>
            <Text>
              <strong>{section.title}</strong>
            </Text>
            {Array.isArray(section.links) &&
              section.links.map(link => (
                <Link className={styles.link} href={link.link} key={link.label}>
                  {link.label}
                </Link>
              ))}
          </div>
        ))}
      </div>
    )}
    {copyright && <TextNotation>{copyright}</TextNotation>}
  </footer>
);
