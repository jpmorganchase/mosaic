import React, { ReactElement } from 'react';
export interface HeroLink {
  label: string;
  url: string;
}
/**
 * The HeroProps interface.
 */
export interface HeroProps {
  backgroundImage?: string;
  /** Additional class name for root class override. */
  className?: string;
  /** Prop to provide a datestamp. */
  datestamp?: string;
  datestampLabel?: string;
  /** The content of the Hero. */
  description?: string | ReactElement;
  /** An optional eyebrow. */
  eyebrow?: string;
  /** Image to be displayed. */
  image?: string;
  /** The title of the Hero. */
  title: string | ReactElement;
  links?: HeroLink[];
  /** Defines the variant.
   * @defaultValue `regular`
   */
  variant?: 'regular' | 'fullWidth' | 'framed';
}
/**
 * Renders a Hero image.
 * @example
 * ```tsx
 * <Hero
 *  description="Insert your description here"
 *  image="img/hero_image.png"
 *  title="Title"
 *  variant="regular"
 * />
 * ```
 */
export declare const Hero: React.FC<React.PropsWithChildren<HeroProps>>;
