import React from 'react';
declare type Variant = 'caution' | 'important' | 'note' | 'tip' | 'warning';
/**
 * The props type for [[`Callout`]].
 */
export interface CalloutProps {
  /** The content of the callout. */
  children?: React.ReactNode;
  /** Additional class name for root class override. */
  className?: string;
  /** Title override. */
  title?: string;
  /**
   * The variant of the alert.
   *
   * @defaultValue `note`
   */
  variant?: Variant;
}
/**
 * Renders a callout. Callouts sit within bodies of text and use visual cues to draw user attention to an important piece of information.
 *
 * @example
 * ```tsx
 * <Callout variant="tip">
 * Multiline Message text lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
 * amet. Multiline Message text lorem ipsum dolor sit amet
 * </Callout>
 * ```
 *
 */
export declare const Callout: React.FC<CalloutProps>;
export {};
