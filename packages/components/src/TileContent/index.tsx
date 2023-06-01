'use client';
import React, { FC, forwardRef, ReactNode, Ref } from 'react';
import classnames from 'clsx';

import { useTileState } from '../TileBase';
import styles, {
  descriptionRecipe,
  eyebrowRecipe,
  imageRecipe,
  rootRecipe,
  tileImageRecipe,
  titleRecipe
} from './styles.css';
import { Size } from '../common/types';
import { useImageComponent } from '../ImageProvider';

export type TileContentClassesType = {
  action?: string;
  description?: string;
  highlighted?: string;
  icon?: string;
  image?: string;
  root?: string;
  title?: string;
};

export interface TileContentProps {
  /** Description of the action that occurs upon click */
  action?: string | ReactNode;
  /** Caption */
  caption?: string | ReactNode;
  /** Classname override for tile content */
  classes?: TileContentClassesType;
  /** Additional class name for root class override */
  className?: string;
  /** Is tile disabled */
  disabled?: boolean;
  /** Description of the the content */
  description?: string | ReactNode;
  /** Image */
  image?: string | ReactNode;
  /** Placement of the image */
  imagePlacement?: 'left' | 'top' | 'fullWidth';
  /** Event fired when image url fails to load */
  onImageError?: React.DOMAttributes<HTMLImageElement>['onError'];
  /** Eyebrow of the the Tile */
  eyebrow?: string;
  /** Title of the the Tile */
  title?: string;
  /** Tile size */
  size?: Size | 'fitContent' | 'fullWidth';
}

const TileImage: FC<
  React.PropsWithChildren<
    Pick<TileContentProps, 'classes' | 'image' | 'imagePlacement' | 'onImageError'>
  >
> = ({ classes = {}, image, imagePlacement, onImageError }) => {
  let tileImage = image;
  const imageUrl = typeof image === 'string' ? image : undefined;
  const ImageComponent = useImageComponent();
  if (imageUrl) {
    tileImage = (
      <ImageComponent
        alt=""
        aria-describedby="tilecontent-description"
        className={classnames(classes.image, imageRecipe({ imagePlacement }))}
        fill
        onError={onImageError}
        src={imageUrl}
      />
    );
  }
  return <div className={tileImageRecipe({ imagePlacement })}>{tileImage}</div>;
};

export const TileContent: FC<React.PropsWithChildren<TileContentProps>> = forwardRef(
  (
    {
      action,
      caption,
      className,
      classes = {},
      description,
      disabled,
      image,
      imagePlacement = 'top',
      onImageError,
      size = 'small',
      title,
      eyebrow,
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const {
      highlighted: [isHighlighted]
    } = useTileState();
    const highlightedClass = classes.highlighted && isHighlighted ? classes.highlighted : undefined;
    let captionElement = caption;
    if (typeof caption === 'string') {
      captionElement = <p className={styles.caption}>{caption}</p>;
    }
    return (
      <div
        className={classnames(
          className,
          rootRecipe({ imagePlacement }),
          styles.root,
          classes.root,
          highlightedClass,
          {
            [styles.columnLayout]: imagePlacement === 'top' || imagePlacement === 'fullWidth',
            [styles.rowLayout]: imagePlacement === 'left'
          }
        )}
        ref={ref}
        {...rest}
      >
        {image ? (
          <TileImage
            classes={classes}
            image={image}
            imagePlacement={imagePlacement}
            onImageError={onImageError}
          />
        ) : null}
        <div className={styles.body}>
          <div className={styles.textContent}>
            {eyebrow !== undefined ? (
              <p className={eyebrowRecipe({ imagePlacement })}>{eyebrow}</p>
            ) : null}
            <p
              className={classnames(
                titleRecipe({
                  imagePlacement,
                  size,
                  hasEyebrow: eyebrow !== undefined ? 'yes' : 'no'
                }),
                classes.title
              )}
              id="tilecontent-title"
            >
              {title}
            </p>
            <p className={classnames(descriptionRecipe({ size }), classes.description)}>
              {description}
            </p>
            {captionElement}
          </div>
          <div className={classnames(styles.action, classes.action)}>{action}</div>
        </div>
      </div>
    );
  }
);
