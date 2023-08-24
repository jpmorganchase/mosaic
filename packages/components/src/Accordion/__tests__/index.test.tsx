import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/dom';

import { Accordion, AccordionDetails, AccordionSection, AccordionSummary } from '../index';

describe('GIVEN an `Accordion` component', () => {
  test('THEN should render a default state', () => {
    const { getAllByRole, queryAllByRole } = render(
      <Accordion>
        <AccordionSection>
          <AccordionSummary>SUMMARY 1</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 1</AccordionDetails>
        </AccordionSection>
        <AccordionSection>
          <AccordionSummary>SUMMARY 2</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 2</AccordionDetails>
        </AccordionSection>
        <AccordionSection>
          <AccordionSummary>SUMMARY 3</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 3</AccordionDetails>
        </AccordionSection>
      </Accordion>
    );
    // assert
    expect(getAllByRole('button').length).toEqual(3);
    expect(queryAllByRole('tabpanel').length).toEqual(0);
  });

  test('THEN should show and hide panels when the tab is clicked', async () => {
    render(
      <Accordion>
        <AccordionSection>
          <AccordionSummary>SUMMARY 1</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 1</AccordionDetails>
        </AccordionSection>
        <AccordionSection>
          <AccordionSummary>SUMMARY 2</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 2</AccordionDetails>
        </AccordionSection>
        <AccordionSection>
          <AccordionSummary>SUMMARY 3</AccordionSummary>
          <AccordionDetails role="tabpanel">CONTENT 3</AccordionDetails>
        </AccordionSection>
      </Accordion>
    );
    // assert
    expect(screen.queryAllByRole('button').length).toEqual(3);
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('tabpanel').length).toEqual(0); // nothing visible

    // act - click to open tab 2
    let tab2 = screen.getAllByRole('button')[1];
    userEvent.click(tab2);
    // assert
    await waitFor(() =>
      expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'true')
    );
    await waitFor(() => expect(screen.queryAllByRole('tabpanel').length).toEqual(1));
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');

    const visiblePanelContent = within(screen.queryAllByRole('tabpanel')[0]).getByText('CONTENT 2');
    expect(visiblePanelContent).toBeDefined();

    // act - click to close tab 2
    tab2 = screen.getAllByRole('button')[1];
    userEvent.click(tab2);

    // assert
    await waitFor(() =>
      expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'false')
    );
    await waitFor(() => expect(screen.queryAllByRole('tabpanel').length).toEqual(0));
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');
  });
});
