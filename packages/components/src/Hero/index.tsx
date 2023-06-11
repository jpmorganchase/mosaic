'use client';
import React, { ReactElement } from 'react';
import classnames from 'clsx';
import { LinkButton } from '../LinkButton';

import styles from './styles.css';
import { Eyebrow, H1, P2 } from '../Typography';
import { useImageComponent } from '../ImageProvider';

const formatTitle = (fullWidth: boolean, title: string, key: string): React.ReactNode => {
  const lines = title ? title.split('<br>') : [];
  return lines.map((line, index) => (
    <H1
      className={classnames({
        [styles.fullWidthTitle]: fullWidth,
        [styles.title]: !fullWidth
      })}
      key={`${key}-${index}`}
    >
      {line}
    </H1>
  ));
};
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

function HeroImageContainer({ isFramed, heroBackgroundImage, heroImage, isFullWidth }) {
  const ImageComponent = useImageComponent();

  if (isFramed) {
    return (
      <div className={styles.frame}>
        {heroBackgroundImage && (
          <ImageComponent
            alt="main background image"
            className={styles.frameBackgroundImage}
            fill
            src={heroBackgroundImage}
            priority
          />
        )}
        <ImageComponent alt="main" className={styles.frameImage} src={heroImage} priority fill />
      </div>
    );
  }
  return (
    <ImageComponent
      alt="main"
      className={classnames(styles.image, {
        [styles.fullWidthImage]: isFullWidth,
        [styles.imageWidth]: !isFullWidth
      })}
      fill
      src={heroImage}
      priority
    />
  );
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
export const Hero: React.FC<React.PropsWithChildren<HeroProps>> = ({
  backgroundImage,
  className,
  datestamp,
  datestampLabel = 'Last Modified',
  description,
  eyebrow,
  image,
  title,
  links,
  variant = 'regular',
  ...rest
}) => {
  const isFullWidth = variant === 'fullWidth';
  const isFramed = variant === 'framed';

  return (
    <div
      className={classnames(
        styles.root,
        {
          [styles.fullWidth]: isFullWidth,
          [styles.fixedSize]: !isFullWidth
        },
        className
      )}
      role="banner"
      {...rest}
    >
      <div className={styles.heading} role="heading">
        {eyebrow ? <Eyebrow className={styles.eyebrow}>{eyebrow}</Eyebrow> : null}
        {typeof title === 'string' ? formatTitle(isFullWidth, title, 'title') : title}
        {datestamp ? (
          <>
            <label className={styles.datestampLabel} id="last-modified-label">
              {datestampLabel}:
            </label>
            <span aria-labelledby="last-modified-label" className={styles.datestamp}>
              {new Date(datestamp).toLocaleString()}
            </span>
          </>
        ) : null}
        {description ? <P2 className={styles.description}>{description}</P2> : null}
        {links ? (
          <div className={styles.links}>
            {links.map((link, linkIndex) => {
              const isLastLink = linkIndex === links.length - 1;
              return (
                <div
                  className={classnames({
                    [styles.link]: !isLastLink,
                    [styles.lastLink]: isLastLink
                  })}
                  key={link.label}
                >
                  <LinkButton href={link.url} variant="regular">
                    {link.label}
                  </LinkButton>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {image ? (
        <HeroImageContainer
          heroBackgroundImage={backgroundImage}
          heroImage={image}
          isFramed={isFramed}
          isFullWidth={isFullWidth}
        />
      ) : null}
    </div>
  );
};
