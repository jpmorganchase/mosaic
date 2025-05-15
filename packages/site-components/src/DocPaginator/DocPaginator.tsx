import React, { useEffect } from 'react';
import { Card, StackLayout } from '@salt-ds/core';
import { Link, P6, P3, Icon } from '@jpmorganchase/mosaic-components';
import classnames from 'clsx';
import { useRouter } from 'next/router';

import styles from './styles.css';

import { NavigationLink } from '@jpmorganchase/mosaic-store';

export interface DocPaginatorProps {
  /** Link label suffix */
  linkSuffix: string;
  /** Next page */
  next?: NavigationLink;
  /** Previous page */
  prev?: NavigationLink;
}

export const DocPaginator: React.FC<DocPaginatorProps> = ({ linkSuffix, next, prev }) => {
  const router = useRouter();

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

  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        {prev && (
          <Card className={classnames(styles.tile)}>
            <StackLayout>
              <Link className={styles.link} href={prev.route} endIcon="none">
                <span>
                  <P6>Previous {linkSuffix}</P6>
                  <Icon className={classnames(styles.icon, styles.iconPrev)} name="chevronLeft" />
                  <P3 className={classnames(styles.linkText)}>
                    {prev.group ? `${prev.group} / ${prev.title}` : prev.title}
                  </P3>
                </span>
              </Link>
            </StackLayout>
          </Card>
        )}
      </div>
      <div className={styles.right}>
        {next && (
          <Card className={classnames(styles.tile, styles.nextLink)}>
            <StackLayout>
              <Link className={styles.link} href={next.route} endIcon="none">
                <span>
                  <P6>Next {linkSuffix}</P6>
                  <Icon className={classnames(styles.icon, styles.iconNext)} name="chevronRight" />
                  <P3 className={classnames(styles.linkText)}>
                    {next.group ? `${next.group} / ${next.title}` : next.title}
                  </P3>
                </span>
              </Link>
            </StackLayout>
          </Card>
        )}
      </div>
    </div>
  );
};
