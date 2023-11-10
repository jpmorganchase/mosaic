import React from 'react';
export declare type FeatureClassesType = {
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
export declare const Feature: React.FC<FeatureProps>;
