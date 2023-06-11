'use client';
import React, { FC, Ref, forwardRef } from 'react';

import { TileBase, TileBaseProps, useTileState } from '../TileBase';
import { TileContent, TileContentProps } from '../TileContent';
import { Button } from '../Button';

export interface TileButtonProps extends TileBaseProps, TileContentProps {}

function PseudoButton({ children }) {
  const { highlighted: highlightedState } = useTileState();
  const [highlighted] = highlightedState;
  const variant = highlighted ? 'regular' : 'secondary';
  return (
    <Button variant={variant} style={{ pointerEvents: 'none' }}>
      {children}
    </Button>
  );
}

export const TileButton: FC<React.PropsWithChildren<TileButtonProps>> = forwardRef(
  (
    {
      action = 'Edit',
      description,
      disabled = false,
      eyebrow,
      image,
      imagePlacement,
      onImageError,
      onMouseOut,
      onMouseOver,
      onSelect,
      size,
      title,
      ...rest
    },
    ref: Ref<HTMLDivElement>
  ) => {
    const actionButton =
      typeof action === 'string' ? <PseudoButton>{action}</PseudoButton> : action;

    return (
      <TileBase
        disabled={disabled}
        onMouseOut={onMouseOut}
        onMouseOver={onMouseOver}
        onSelect={onSelect}
        ref={ref}
        role="button"
        size={size}
        tabIndex={0}
        {...rest}
      >
        <TileContent
          action={actionButton}
          description={description}
          disabled={disabled}
          eyebrow={eyebrow}
          image={image}
          imagePlacement={imagePlacement}
          onImageError={onImageError}
          size={size}
          title={title}
        />
      </TileBase>
    );
  }
);
