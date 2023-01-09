import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactLive } from '../ReactLive';

describe('GIVEN a ReactLive view', () =>
  it('THEN it should render code in a live view', async () => {
    // arrange
    const { getAllByRole } = render(<ReactLive language="jsx">{'<h1>Hello World</h1>'}</ReactLive>);

    // assert
    await waitFor(() => {
      expect(screen.getByText('Show Live Code')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
    // act
    const showLiveCode = screen.getByText('Show Live Code');
    fireEvent.click(showLiveCode);

    // assert
    expect(getAllByRole('textbox')[0]).toHaveAttribute('class', 'liveEditor');
  }));
