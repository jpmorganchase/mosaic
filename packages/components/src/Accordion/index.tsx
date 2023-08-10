import React from 'react';
import {
  AccordionGroup,
  Accordion as SaltAccordion,
  AccordionHeader,
  AccordionPanel
} from '@salt-ds/core';
import type { AccordionGroupProps as SaltAccordionGroupProps } from '@salt-ds/core';
import styles from './styles.css';

export interface Panel {
  expanded: boolean;
  summary: React.ReactNode;
  content: React.ReactNode;
}

export {
  Accordion as AccordionSection,
  AccordionPanel as AccordionDetails,
  AccordionHeader as AccordionSummary
} from '@salt-ds/core';

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
      <SaltAccordion
        defaultExpanded={panelItem.expanded}
        key={`panelItem-${panelIndex}`}
        value={`panelItem-${panelIndex}`}
      >
        <AccordionHeader className={styles.summary}>{panelItem.summary}</AccordionHeader>
        <AccordionPanel className={styles.content}>{panelItem.content}</AccordionPanel>
      </SaltAccordion>
    ));
  }
  return <AccordionGroup {...rest}>{accordionChildren}</AccordionGroup>;
};
