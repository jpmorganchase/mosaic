import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ToolbarProvider } from '../../ToolbarProvider';
import { FilterSortDropdown } from '../index';

test('renders a sort dropdown', async () => {
  // arrange
  const source = ['Sort 1', 'Sort 2', 'Sort 3'];
  const { getAllByRole, getByText } = render(
    <ToolbarProvider initialState={{ sort: 'Sort 1' }}>
      <FilterSortDropdown source={source} />
    </ToolbarProvider>
  );
  // assert
  expect(getAllByRole('combobox').length).toEqual(1);
  // action
  const dropdownButton = getByText('Sort 1');
  fireEvent.click(dropdownButton);
  // assert
  await waitFor(() => expect(getAllByRole('option').length).toEqual(3));
});
