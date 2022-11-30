import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvents from '@testing-library/user-event';

import { ToolbarProvider } from '../../ToolbarProvider';
import { FilterSearch } from '../index';

test('updates the toolbar filters state when Filter 2 is selected', async () => {
  const source = ['Filter 1', 'Filter 2', 'Filter 3'];
  const handleStateChangeMock = jest.fn();
  // arrange
  const { getByTestId } = render(
    <ToolbarProvider onStateChange={handleStateChangeMock}>
      <FilterSearch
        InputProps={{ inputProps: { 'data-mosaic-testid': 'test-input' } }}
        source={source}
      />
    </ToolbarProvider>
  );
  // action
  const searchInput = getByTestId('test-input');
  await userEvents.type(searchInput, 'Filter'); // lower case to test filter
  // assert
  expect(screen.getAllByRole('option').length).toEqual(3);

  // action
  await userEvents.click(screen.getByRole('option', { name: 'Filter 2' }));

  // assert
  expect(handleStateChangeMock).toHaveBeenLastCalledWith({
    filters: ['Filter 2'],
    hasStateChanged: true
  });
});
