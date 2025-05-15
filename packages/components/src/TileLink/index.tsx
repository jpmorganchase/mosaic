import React, { FC, Ref, forwardRef, ReactNode } from 'react';

import { LinkBase } from '../LinkBase';
import { hasProtocol } from '../utils';
import { Card, type CardProps, Text, useIcon } from '@salt-ds/core';
import classnames from 'clsx';
import { useImageComponent } from '../ImageProvider';
import styles from './TileLink.module.css';

export interface TileLinkProps extends CardProps {
  /** Link href */
  link?: string;
}

const TileImage: FC<
  React.PropsWithChildren<Pick<TileContentProps, 'image' | 'imagePlacement' | 'onImageError'>>
> = ({ image, imagePlacement, onImageError }) => {
  let tileImage = image;
  const imageUrl = typeof image === 'string' ? image : undefined;
  const ImageComponent = useImageComponent();
  if (imageUrl) {
    tileImage = (
      <ImageComponent
        alt=""
        aria-describedby="tilecontent-description"
        className={{
          [styles.imageSizeFullWidth]: imagePlacement === 'fullWidth',
          [styles.imageSizeDefault]: imagePlacement !== 'fullWidth'
        }}
        fill
        onError={onImageError}
        src={imageUrl}
      />
    );
  }
  return <div className={imagePlacement}>{tileImage}</div>;
};

interface TileContentProps {
  /** Description of the action that occurs upon click */
  action?: string | ReactNode;
  /** Caption */
  caption?: string | ReactNode;
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
  /** Eyebrow of the Tile */
  eyebrow?: string;
  /** Title of the Tile */
  title?: string;
}

export const TileLink: FC<React.PropsWithChildren<TileLinkProps & TileContentProps>> = forwardRef(
  (
    {
      action = 'Documentation Overview',
      caption,
      className,
      description,
      disabled = false,
      eyebrow,
      image,
      imagePlacement,
      onImageError,
      link,
      title,
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const canRenderLink = !disabled && link?.length;

    let captionNode = caption;
    if (typeof caption === 'string') {
      captionNode = (
        <Text styleAs={'notation'} className={styles.caption}>
          {caption}
        </Text>
      );
    }
    const { ExternalIcon, NextIcon } = useIcon();

    const isInternal = !hasProtocol(link);

    const content = (
      <div className={styles.content}>
        {image ? (
          <TileImage
            aria-describedby="tilecontent-title"
            image={image}
            imagePlacement={imagePlacement}
            onImageError={onImageError}
          />
        ) : null}
        {eyebrow !== undefined ? (
          <Text styleAs={'h4'} className={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text id="tilecontent-title" styleAs={'h2'} className={styles.title}>
          {title}
        </Text>
        {description !== undefined ? <div className={styles.description}>{description}</div> : null}
        {captionNode}
        <Text className={styles.action} styleAs={'action'}>
          {action}
          {isInternal ? (
            <NextIcon aria-label="load page" />
          ) : (
            <ExternalIcon aria-label="open external page in new tab" />
          )}
        </Text>
      </div>
    );

    return (
      <Card interactable className={classnames(className, styles.root)} {...rest} ref={ref}>
        {canRenderLink ? (
          <LinkBase href={link} tabIndex={0}>
            {content}
          </LinkBase>
        ) : (
          content
        )}
      </Card>
    );
  }
);
