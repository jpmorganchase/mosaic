import React from 'react';
import { type AccordionPanelProps, type AccordionHeaderProps } from '@salt-ds/core';
import type { AccordionGroupProps as SaltAccordionGroupProps } from '@salt-ds/core';
export interface Panel {
  expanded: boolean;
  summary: React.ReactNode;
  content: React.ReactNode;
}
export { Accordion as AccordionSection } from '@salt-ds/core';
export declare const AccordionDetails: ({ className, ...rest }: AccordionPanelProps) => JSX.Element;
export declare const AccordionSummary: ({
  className,
  ...rest
}: AccordionHeaderProps) => JSX.Element;
export interface AccordionProps extends SaltAccordionGroupProps {
  panels?: Panel[];
}
/**
 * Renders an Accordion. The Accordion component consists of a series of collapsible panels.
 * Use to maximise space and allow the user to show and hide content.
 * @example
 * ```tsx
 *   <Accordion
 *   panels={[
 *    {
 *       summary: 'Eliminate multiple identity credentials',
 *       content: 'Your content will appear in its own expanded panel',
 *       expanded: true
 *     },
 *     {
 *       summary: 'Passwords and security questions',
 *       content: 'Your content will appear in its own expanded panel',
 *       expanded: false
 *     }
 *   ]}
 * />
 * ```
 *
 * or use it as a compound component and render richer content
 *
 * <Accordion>
 *   <AccordionSection>
 *      <AccordionSummary>
 *          Summary Text
 *      <AccordionSummary>
 *      <AccordionDetails>
 *          Accordion section detail
 *      <AccordionDetails>
 *   </AccordionSection>
 * </Accordion>
 */
export declare const Accordion: React.FC<React.PropsWithChildren<AccordionProps>>;
