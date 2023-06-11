'use client';
import React, { FC, ReactNode } from 'react';

import { LinkBase } from '../LinkBase';
import { LinkText } from '../LinkText';
import { TileBase, useTileState } from '../TileBase';
import { useImageComponent } from '../ImageProvider';
import styles, { imageRecipe, tileImageRecipe } from './styles.css';

const PseudoLink = ({ children }) => {
  const {
    highlighted: [isHighlighted]
  } = useTileState();
  return (
    <LinkText endIcon="chevronRight" hovered={isHighlighted}>
      {children}
    </LinkText>
  );
};

export type EditionTileLinkProps = {
  /** Additional class name for root class override */
  className?: string;
  /** Link description  */
  description?: ReactNode;
  /** Eyebrow text describing the content type */
  eyebrow?: string;
  /** Image associated with edition */
  image?: string;
  /** Placement of the image */
  imagePlacement?: 'left' | 'fullWidth';
  /** Link href */
  link: string;
  /** Edition title */
  title?: string;
};

const TileImage: FC<
  React.PropsWithChildren<Pick<EditionTileLinkProps, 'image' | 'imagePlacement'>>
> = ({ image, imagePlacement }) => {
  const ImageComponent = useImageComponent();
  if (!image || !ImageComponent) {
    return null;
  }
  return (
    <div className={tileImageRecipe({ imagePlacement })}>
      <ImageComponent
        alt=""
        aria-describedby="tilecontent-description"
        className={imageRecipe({ imagePlacement })}
        fill
        src={image}
      />
    </div>
  );
};

export const EditionTileLink: React.FC<React.PropsWithChildren<EditionTileLinkProps>> = ({
  description,
  eyebrow = null,
  image,
  imagePlacement = 'fullWidth',
  link,
  title,
  ...rest
}) => (
  <TileBase className={styles.root} {...rest} size="fullWidth">
    <LinkBase
      className={styles.content}
      aria-labelledby="tilecontent-title"
      href={link}
      tabIndex={0}
    >
      {image ? <TileImage image={image} imagePlacement={imagePlacement} /> : null}
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        {title ? <p className={styles.title}>{title}</p> : null}
        {description ? <div className={styles.description}>{description}</div> : null}
        <PseudoLink>
          <p className={styles.action}>Read More</p>
        </PseudoLink>
      </div>
    </LinkBase>
  </TileBase>
);
