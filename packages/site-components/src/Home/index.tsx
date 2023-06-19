'use client';
import React from 'react';
import classnames from 'clsx';
import { useImageComponent } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

export type HomeHeroProps = {
  /** The child components representing Home's Hero content */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
};
export const HomeHero: React.FC<HomeHeroProps> = ({ children, className, ...rest }) => (
  <section className={className} {...rest}>
    {children}
  </section>
);

export type HomeSectionProps = {
  /** The child components representing a section within the Home component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
};
export const HomeSection: React.FC<HomeSectionProps> = ({ children, className, ...rest }) => (
  <section className={classnames(styles.section, className)} {...rest}>
    {children}
  </section>
);

function BackgroundImages() {
  const ImageComponent = useImageComponent();

  return (
    <>
      <div className={classnames(styles.backgroundImage, styles.backgroundImage1)}>
        <ImageComponent width={254} height={193} src={'/img/backgroundImg1.png'} />
      </div>
      <div className={classnames(styles.backgroundImage, styles.backgroundImage2)}>
        <ImageComponent width={385} height={214} src={'/img/backgroundImg2.png'} />
      </div>
      <div className={classnames(styles.backgroundImage, styles.backgroundImage3)}>
        <ImageComponent width={629} height={1024} src={'/img/backgroundImg3.png'} />
      </div>
      <div className={classnames(styles.backgroundImage, styles.backgroundImage4)}>
        <ImageComponent width={750} height={813} src={'/img/backgroundImg4.png'} />
      </div>
      <div className={classnames(styles.backgroundImage, styles.backgroundImage5)}>
        <ImageComponent width={385} height={214} src={'/img/backgroundImg2.png'} />
      </div>
    </>
  );
}

export type HomeProps = {
  /** The children components of the Section component */
  children?: React.ReactNode;
  /** Additional class name for root class override */
  className?: string;
};

export interface HomeComposition {
  /** The initial hero section of the Home component */
  Hero?: typeof HomeHero;
  /** A content section for the Home component */
  Section?: typeof HomeSection;
}

export const Home: React.FC<HomeProps> & HomeComposition = ({ children, className, ...rest }) => (
  <main className={classnames(className, styles.main)} {...rest}>
    <BackgroundImages />
    {children}
  </main>
);

Home.Hero = HomeHero;
Home.Section = HomeSection;
