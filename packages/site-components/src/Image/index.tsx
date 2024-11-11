import { FC, forwardRef, Ref } from 'react';
import NextImage, { type ImageProps as NextImageProps } from 'next/image';
import classnames from 'clsx';

import styles from './styles.css';

export type ImageProps = Omit<NextImageProps, 'src'> & {
  /**
   * Image source url
   */
  src: string;
  /**
   * class name to apply to the inner Next Image component
   */
  nextImageClassName?: string;
};

export const Image: FC<ImageProps> = forwardRef(
  (
    {
      alt,
      className,
      nextImageClassName,
      src,
      width,
      height,
      fill,
      unoptimized = !process.env.OPTIMIZE_IMAGES || false,
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    return (
      <div className={classnames(styles.root, className)} ref={ref}>
        {fill || (width && height) ? (
          <NextImage
            alt={alt}
            className={classnames(styles.nextImage, nextImageClassName)}
            {...rest}
            height={height}
            fill={fill}
            src={src}
            width={width}
            unoptimized={unoptimized}
          />
        ) : (
          <img alt={alt} className={styles.img} src={src} />
        )}
      </div>
    );
  }
);
