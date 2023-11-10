import React from 'react';
export interface HelpLinkDescriptor {
  label: string;
  link: string;
}
/**
 * The HelpLinksProps interface.
 */
export interface HelpLinksProps {
  /** Additional class name for root class override. */
  className?: string;
  /** The URL to link to when the Stack Overflow link is clicked. */
  stackoverflowLabel?: string;
  /** The label of the Stack Overflow link. */
  stackoverflowUrl?: string;
  /** An optional title above the links. */
  subTitle?: string;
  /** The label of the Symphony link. */
  symphonyLabel?: string;
  /** The URL to link to when the Symphony link is clicked. */
  symphonyUrl?: string;
  links?: Array<HelpLinkDescriptor>;
}
/**
 * Renders a HelpLinks component. This component is used to create Stack Overflow and Symphony help links.
 * @example
 * ```tsx
 * <HelpLinks
 *   stackoverflowUrl="https://stackexchange.com/some/url"
 *   symphonyUrl="symhony://some/url"
 * />
 * ```
 */
export declare const HelpLinks: React.FC<React.PropsWithChildren<HelpLinksProps>>;
