import React, { FC, forwardRef, Ref } from 'react';
import { default as NextImage } from 'next/legacy/image';
import type { ImageProps as NextImageProps } from 'next/legacy/image';
import classnames from 'classnames';

import { useResolveRelativeUrl } from '../BaseUrlProvider';
import styles from './styles.css';

export type ImageProps = Omit<NextImageProps, 'src'> & {
  src: string;
};

export const Image: FC<ImageProps> = forwardRef(
  ({ className, src, width, height, layout, ...rest }, ref: Ref<HTMLDivElement>) => {
    const resolvedSrc = useResolveRelativeUrl(src);
    return (
      <div className={classnames(styles.root, className)} ref={ref}>
        {layout === 'fill' || (width && height) ? (
          <NextImage
            {...rest}
            height={height}
            layout={layout || 'fixed'}
            src={src.match(/^(http[s]?:)?\/{1,2}/) === null ? resolvedSrc : src}
            width={width}
          />
        ) : (
          <img
            className={styles.img}
            src={src.match(/^(http[s]?:)?\/{1,2}/) === null ? resolvedSrc : src}
          />
        )}
      </div>
    );
  }
);
