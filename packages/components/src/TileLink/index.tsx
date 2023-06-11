'use client';
import React, { FC, Ref, forwardRef } from 'react';

import { TileBase, TileBaseProps, useTileState } from '../TileBase';
import { TileContent, TileContentProps } from '../TileContent';
import styles from './styles.css';
import { LinkBase } from '../LinkBase';
import { LinkText } from '../LinkText';
import { hasProtocol } from '../utils/hasProtocol';

export interface TileLinkProps extends TileBaseProps, TileContentProps {
  /** Link href */
  link?: string;
}

const PseudoLink = ({ children, disabled, link }) => {
  const {
    highlighted: [isHighlighted]
  } = useTileState();
  const isInternal = !hasProtocol(link);
  return (
    <LinkText
      disabled={disabled}
      endIcon={isInternal ? 'chevronRight' : 'tearOut'}
      hovered={isHighlighted}
    >
      {children}
    </LinkText>
  );
};

export const TileLink: FC<React.PropsWithChildren<TileLinkProps>> = forwardRef(
  (
    {
      action = 'Documentation Overview',
      caption,
      description,
      disabled = false,
      eyebrow,
      image,
      imagePlacement,
      link,
      size,
      title,
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const tileContent = (
      <TileContent
        action={
          <PseudoLink disabled={disabled} link={link}>
            {action}
          </PseudoLink>
        }
        caption={caption}
        description={description}
        disabled={disabled}
        eyebrow={eyebrow}
        image={image}
        imagePlacement={imagePlacement}
        size={size}
        title={title}
      />
    );
    const canRenderLink = !disabled && link && link.length;
    return (
      <TileBase disabled={disabled} ref={ref} size={size} {...rest}>
        {canRenderLink ? (
          <LinkBase
            aria-labelledby="tilecontent-title"
            className={styles.link}
            href={link}
            tabIndex={0}
          >
            {tileContent}
          </LinkBase>
        ) : (
          tileContent
        )}
      </TileBase>
    );
  }
);
