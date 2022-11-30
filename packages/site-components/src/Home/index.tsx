import React from 'react';
import classnames from 'classnames';

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
    {children}
  </main>
);

Home.Hero = HomeHero;
Home.Section = HomeSection;
