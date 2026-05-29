import { FC, forwardRef, Ref } from 'react';
import NextImage, { type ImageProps as NextImageProps } from 'next/image';
import classnames from 'clsx';

import { useResolveRelativeUrl } from '../BaseUrlProvider';
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
      // Must read a NEXT_PUBLIC_* env var so the value is statically inlined
      // identically on both server and client. Reading a non-public env var
      // (e.g. `OPTIMIZE_IMAGES`) would yield different values during SSR vs.
      // client hydration and cause a hydration mismatch on the rendered <img>
      // (server emits `srcSet`/`sizes` from next/image optimization, client
      // emits the raw `src`). See React hydration-mismatch docs.
      //
      // Note: env vars are always strings. The string "false" is truthy, so
      // we must compare explicitly rather than using `!process.env.X`.
      // Optimization is enabled only when the var is the literal "true".
      unoptimized = process.env.NEXT_PUBLIC_OPTIMIZE_IMAGES !== 'true',
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const resolvedSrc = useResolveRelativeUrl(src);
    return (
      <div className={classnames(styles.root, className)} ref={ref}>
        {fill || (width && height) ? (
          <NextImage
            alt={alt}
            className={classnames(styles.nextImage, nextImageClassName)}
            {...rest}
            height={height}
            fill={fill}
            src={src.match(/^(http[s]?:)?\/{1,2}/) === null ? resolvedSrc : src}
            width={width}
            unoptimized={unoptimized}
          />
        ) : (
          <img
            alt={alt}
            className={styles.img}
            src={src.match(/^(http[s]?:)?\/{1,2}/) === null ? resolvedSrc : src}
          />
        )}
      </div>
    );
  }
);
