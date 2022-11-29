import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

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
    expect(queryAllByRole('tabpanel').length).toEqual(3);
  });

  test('THEN should show and hide panels when the tab is clicked', async () => {
    const { getByRole, getAllByRole, queryAllByRole } = render(
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
    expect(queryAllByRole('button').length).toEqual(3);
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('CONTENT 1')).not.toBeInTheDocument();
    expect(screen.queryByText('CONTENT 2')).not.toBeInTheDocument();
    expect(screen.queryByText('CONTENT 3')).not.toBeInTheDocument();

    // act - click to open tab 2
    let tab2 = getAllByRole('button')[1];
    fireEvent.click(tab2);

    // assert
    await waitFor(() => expect(getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(screen.queryByText('CONTENT 2')).toBeInTheDocument());
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('CONTENT 1')).not.toBeInTheDocument();
    expect(screen.queryByText('CONTENT 3')).not.toBeInTheDocument();

    // act - click to close tab 2
    tab2 = getAllByRole('button')[1];
    fireEvent.click(tab2);

    // assert
    await waitFor(() =>
      expect(getAllByRole('button')[1]).toHaveAttribute('aria-expanded', 'false')
    );
    await waitFor(() => expect(screen.queryByText('CONTENT 2')).not.toBeInTheDocument());
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[2]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('CONTENT 1')).not.toBeInTheDocument();
    expect(screen.queryByText('CONTENT 3')).not.toBeInTheDocument();
  });
});
