'use client';
import React from 'react';
import {
  Accordion as SaltAccordion,
  AccordionSection,
  AccordionSummary,
  AccordionDetails
} from '@salt-ds/lab';
import type { AccordionProps as SaltAccordionProps } from '@salt-ds/lab';
import styles from './styles.css';

export interface Panel {
  expanded: boolean;
  summary: React.ReactNode;
  content: React.ReactNode;
}

export { AccordionSection, AccordionSummary, AccordionDetails } from '@salt-ds/lab';

export interface AccordionProps extends SaltAccordionProps {
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
 *   <AccordionSection summary="your summary text">
 *      <AccordionSummary defaultExpanded>
 *          Accordion section heading
 *      <AccordionSummary>
 *      <AccordionDetails>
 *          Accordion section detail
 *      <AccordionDetails>
 *   </AccordionSection>
 * </Accordion>
 */
export const Accordion: React.FC<React.PropsWithChildren<AccordionProps>> = ({
  children,
  panels,
  ...rest
}) => {
  let accordionChildren = children;
  /** Panels props to be deprecated in the future and create as a compound component */
  if (panels) {
    accordionChildren = panels.map((panelItem, panelIndex) => (
      <AccordionSection defaultExpanded={panelItem.expanded} key={`panelItem-${panelIndex}`}>
        <AccordionSummary className={styles.summary}>{panelItem.summary}</AccordionSummary>
        <AccordionDetails role="tabpanel" className={styles.content}>
          {panelItem.content}
        </AccordionDetails>
      </AccordionSection>
    ));
  }
  return (
    <SaltAccordion maxExpandedItems={1} {...rest}>
      {accordionChildren}
    </SaltAccordion>
  );
};
