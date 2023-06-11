import React, { Suspense } from 'react';
import classnames from 'clsx';
import { Link, P6, P3, TileBase, Icon } from '@jpmorganchase/mosaic-components';
import { NavigationLink } from '@jpmorganchase/mosaic-store';

import styles from './styles.css';
import { NavigationEvents } from '../NavigationEvents';

export interface DocPaginatorProps {
  /** Link label suffix */
  linkSuffix: string;
  /** Next page */
  next?: NavigationLink;
  /** Previous page */
  prev?: NavigationLink;
}

export const DocPaginator: React.FC<DocPaginatorProps> = ({ linkSuffix, next, prev }) => {
  const handleRouteChangeComplete = () => {
    setTimeout(() => {
      if (window.pageYOffset > 0) {
        window.scroll({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  return (
    <>
      <Suspense fallback={null}>
        <NavigationEvents onRouteChange={handleRouteChangeComplete} />
      </Suspense>
      <div className={styles.root}>
        <div className={styles.left}>
          {prev && (
            <TileBase border className={styles.tile}>
              <Link className={styles.link} href={prev.route} endIcon="none">
                <>
                  <P6>Previous {linkSuffix}</P6>
                  <Icon className={classnames(styles.icon, styles.iconPrev)} name="chevronLeft" />
                  <P3 className={classnames(styles.linkText)}>{prev.title}</P3>
                </>
              </Link>
            </TileBase>
          )}
        </div>
        <div className={styles.right}>
          {next && (
            <TileBase border className={classnames(styles.tile, styles.nextLink)}>
              <Link className={styles.link} href={next.route} endIcon="none">
                <>
                  <P6>Next {linkSuffix}</P6>
                  <Icon className={classnames(styles.icon, styles.iconNext)} name="chevronRight" />
                  <P3 className={classnames(styles.linkText)}>{next.title}</P3>
                </>
              </Link>
            </TileBase>
          )}
        </div>
      </div>
    </>
  );
};
