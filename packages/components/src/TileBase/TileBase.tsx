import React, { FC, forwardRef, Ref } from 'react';
import classnames from 'clsx';

import styles from './styles.css';
import { Size } from '../common/types';
import { useTileState, TileStateProvider } from './TileStateProvider';

export interface TileBaseProps {
  /** Does the tile have an always-visible border? */
  border?: boolean;
  /** Additional class name for root class override */
  className?: string;
  /** Is tile disabled */
  disabled?: boolean;
  /** Blur Handler */
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  /** Focus Handler */
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  /** Mouse Down Handler */
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Out Handler */
  onMouseOut?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Over Handler */
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>;
  /** Mouse Up Handler */
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  /** Callback called when either the mouse is clicked or the enter key pressed */
  onSelect?: (event: React.KeyboardEvent | React.MouseEvent) => void;
  /** The children components of the Tile component */
  children?: React.ReactNode;
  /** aria role */
  role?: string;
  /** Tile size */
  size?: Size | 'fitContent' | 'fullWidth';
  /** tabIndex */
  tabIndex?: number;
  /** Variant */
  variant?: 'regular' | 'grid';
}

export interface TileBaseComponentProps extends TileBaseProps {
  /** Ref */
  tileRef?: Ref<HTMLDivElement>;
}

// Tile is the wrapper for Tile-shaped components
// This is for getting the Tile shape, link and hover effects
// but with the flexibility of passing your own children
export const TileBaseComponent: FC<TileBaseComponentProps> = function TileBase({
  border = false,
  className,
  disabled = false,
  onBlur,
  onFocus,
  onMouseDown,
  onMouseOut,
  onMouseOver,
  onMouseUp,
  onSelect,
  children,
  size,
  tileRef,
  variant = 'regular',
  ...rest
}) {
  const {
    active: activeState,
    focused: focusedState,
    highlighted: highlightedState
  } = useTileState();
  const [, setActive] = activeState;
  const [focused, setFocused] = focusedState;
  const [highlighted, setHighlighted] = highlightedState;

  const handleMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseOver) {
      onMouseOver(event);
    }
    setHighlighted(true);
  };

  const handleMouseOut = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseOut) {
      onMouseOut(event);
    }
    setActive(false);
    setHighlighted(false);
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseUp) {
      onMouseUp(event);
    }
    setActive(false);
  };
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseDown) {
      onMouseDown(event);
    }
    setActive(true);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (onBlur) {
      onBlur(event);
    }
    setFocused(false);
  };

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (onFocus) {
      onFocus(event);
    }
    setFocused(true);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (onSelect) {
      onSelect(event);
    }
  };

  const handleKeypress = (event: React.KeyboardEvent) => {
    if (onSelect && event.key === 'enter') {
      onSelect(event);
    }
  };

  return (
    <div
      className={classnames(styles.root, className, {
        [styles.border]: border,
        [styles.hover]: size !== 'fullWidth' && !disabled && highlighted,
        [styles.hoverFullWidth]: size === 'fullWidth' && !disabled && highlighted,
        [styles.focused]: focused
      })}
      onBlur={handleBlur}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyPress={handleKeypress}
      onMouseDown={handleMouseDown}
      onMouseOut={handleMouseOut}
      onMouseOver={handleMouseOver}
      onMouseUp={handleMouseUp}
      ref={tileRef}
      {...rest}
    >
      {children}
    </div>
  );
};

export const TileBase = forwardRef<HTMLDivElement, TileBaseProps>((props, ref) => (
  <TileStateProvider>
    <TileBaseComponent {...props} tileRef={ref} />
  </TileStateProvider>
));
