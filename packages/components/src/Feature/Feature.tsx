import React from 'react';
import classnames from 'classnames';
import { feature } from '@jpmorganchase/mosaic-theme';

import styles from './styles.css';
import { useImageComponent } from '../ImageProvider';

export type FeatureClassesType = {
  content?: string;
  image?: string;
  title?: string;
};

/**
 * The props type for [[`Feature`]].
 */
export interface FeatureProps {
  /** Additional class name for root class override */
  /** Content of the Feature. */
  children?: React.ReactNode;
  /** Additional class name for root class override. */
  className?: string;
  /** Object to override internal class names. */
  classes?: FeatureClassesType;
  /** Image to be displayed. */
  image?: string;
  /** Image placement, relative to content. */
  imagePlacement?: 'left' | 'right';
  /** The variant of the Feature. */
  variant?: 'primary' | 'secondary' | 'regular';
}

/**
 * Renders a Feature. A Feature consists of an image, associated text description, and actions.
 * @example
 * ```
 * <Feature
 *   image="img/feature_image.png"
 * >
 *  <FeatureTitle>Title</FeatureTitle>
 *  <FeatureContent>
 *    Insert your content here.
 *  </FeatureContent>
 *  <FeatureActions>
 *    <Button link="mailto:contact@example.com:">
 *      Button label
 *    </Button>
 *  </FeatureActions>
 * </Feature>
 * ```
 */
export const Feature: React.FC<FeatureProps> = ({
  children,
  classes = {},
  className,
  image,
  imagePlacement = 'right',
  variant = 'primary',
  ...rest
}) => {
  const isPrimary = variant === 'primary';
  const ImageComponent = useImageComponent();

  return (
    <div
      className={classnames(
        styles.root,
        styles[`${imagePlacement}ImageRoot`],
        styles[`${variant}ContentRoot`],
        feature(),
        className
      )}
      {...rest}
    >
      <div>
        {isPrimary && <div className={classnames(styles.highlightBar)} />}
        {children}
      </div>
      <div>
        {image && (
          <ImageComponent
            alt="feature image"
            aria-describedby="feature image"
            className={classnames(classes.image, styles.image, styles[`${imagePlacement}Image`])}
            fill
            src={image}
          />
        )}
      </div>
    </div>
  );
};
