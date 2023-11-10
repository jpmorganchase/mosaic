import React from 'react';
import { Size } from '../common/types';
export interface TagProps {
  /** Additional class name for overrides */
  className?: string;
  /** Tag category */
  category?: string;
  /** Icon name */
  icon?: string;
  /** Tag label */
  label: string;
  /** Tag size */
  size?: Size;
}
/**
 * Renders a Tag.
 * @example
 * ```tsx
 * <Tag
 *  category="4"
 *  icon="successTick"
 *  label="Label"
 *  size="medium"
 * />
 * ```
 */
export declare const Tag: React.FC<React.PropsWithChildren<TagProps>>;
