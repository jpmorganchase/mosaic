import React from 'react';
import classnames from 'clsx';
import { Link, P6, P3, TileBase, Icon } from '@jpmorganchase/mosaic-components';
import type { NavigationLink } from '@jpmorganchase/mosaic-types';

import styles from './styles.css';

export interface DocPaginatorProps {
  /** Link label suffix */
  linkSuffix: string;
  /** Next page */
  next?: NavigationLink;
  /** Previous page */
  prev?: NavigationLink;
}

export const DocPaginator: React.FC<DocPaginatorProps> = ({ linkSuffix, next, prev }) => {
  return (
    <div className={styles.root}>
      <div className={styles.left}>
        {prev && (
          <TileBase border className={styles.tile}>
            <Link className={styles.link} href={prev.route} endIcon="none">
              <span>
                <P6>Previous {linkSuffix}</P6>
                <Icon className={classnames(styles.icon, styles.iconPrev)} name="chevronLeft" />
                <P3 className={classnames(styles.linkText)}>
                  {prev.group ? `${prev.group} / ${prev.title}` : prev.title}
                </P3>
              </span>
            </Link>
          </TileBase>
        )}
      </div>
      <div className={styles.right}>
        {next && (
          <TileBase border className={classnames(styles.tile, styles.nextLink)}>
            <Link className={styles.link} href={next.route} endIcon="none">
              <span>
                <P6>Next {linkSuffix}</P6>
                <Icon className={classnames(styles.icon, styles.iconNext)} name="chevronRight" />
                <P3 className={classnames(styles.linkText)}>
                  {next.group ? `${next.group} / ${next.title}` : next.title}
                </P3>
              </span>
            </Link>
          </TileBase>
        )}
      </div>
    </div>
  );
};
