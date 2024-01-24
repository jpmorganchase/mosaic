import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { ToolbarProvider } from '../../ToolbarProvider';
import { FilterPillGroup } from '../index';

test('updates the toolbar sort state when a filter is removed', () => {
  // arrange
  const filters = ['Filter 1', 'Filter 2', 'Filter 3'];
  const handleStateChangeMock = jest.fn();
  render(
    <ToolbarProvider initialState={{ filters }} onStateChange={handleStateChangeMock}>
      <FilterPillGroup />
    </ToolbarProvider>
  );
  // assert
  const pills = screen.getAllByTestId('pill');
  expect(pills.length).toEqual(3);
  // action
  fireEvent.click(pills[1]);
  // assert
  expect(handleStateChangeMock).toHaveBeenCalledWith({
    filters: ['Filter 1', 'Filter 3'],
    hasStateChanged: true
  });
});
