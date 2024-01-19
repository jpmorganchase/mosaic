import React, { FC, ReactNode, useRef } from 'react';
import { useImageComponent } from '@jpmorganchase/mosaic-store';

import { useBreakpoint } from '../useBreakpoint';
import styles, { imageRecipe, tileImageRecipe } from './styles.css';
import { Link } from '../Link';
import { TileBase } from '../TileBase';

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
  imagePlacement: imagePlacementProp,
  link,
  title,
  ...rest
}) => {
  const breakpoint = useBreakpoint();
  const linkRef = useRef<HTMLLinkElement>(null);
  const imagePlacementResponsive = breakpoint === 'mobile' ? 'fullWidth' : 'left';
  const imagePlacement = imagePlacementProp || imagePlacementResponsive;

  const handleSelect = () => {
    console.log('handle select');
    /**
     * Why don't we just make the EditionTileLink a link itself and not use refs?
     * Editions may contain content which **includes** links.
     * It is invalid for a link to be within a link and will cause React hydration errors.
     */
    linkRef.current?.click();
  };

  return (
    <TileBase className={styles.root} {...rest} size="fullWidth" onSelect={handleSelect}>
      <article className={styles.content} aria-labelledby="tilecontent-title">
        {image ? <TileImage image={image} imagePlacement={imagePlacement} /> : null}
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          {title ? <p className={styles.title}>{title}</p> : null}
          {description ? <div className={styles.description}>{description}</div> : null}
          <Link
            href={link}
            className={styles.action}
            ref={linkRef}
            aria-labelledby="tilecontent-title"
          >
            Read More
          </Link>
        </div>
      </article>
    </TileBase>
  );
};
