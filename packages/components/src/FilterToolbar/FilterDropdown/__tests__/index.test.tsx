import { test, expect } from 'vitest';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ToolbarProvider } from '../../ToolbarProvider';
import { FilterDropdown } from '../index';

test('renders a filter dropdown', async () => {
  // arrange
  const source = ['Filter 1', 'Filter 2', 'Filter 3'];
  const { getAllByRole, getByText } = render(
    <ToolbarProvider>
      <FilterDropdown source={source} />
    </ToolbarProvider>
  );
  // assert
  expect(getAllByRole('combobox').length).toEqual(1);
  // action
  const dropdownButton = getByText('All');
  fireEvent.click(dropdownButton);
  // assert
  await waitFor(() => expect(getAllByRole('option').length).toEqual(4));
});
