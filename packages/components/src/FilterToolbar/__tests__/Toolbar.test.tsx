import { expect, it, test, vi } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterToolbar } from '../Toolbar';

function renderToolbar(initialState, onStateChange) {
  return render(
    <FilterToolbar initialState={initialState} onStateChange={onStateChange}>
      <label>Another component</label>
      <FilterToolbar.PillGroup />
      <FilterToolbar.SortDropdown
        itemToString={item => `Item ${item}`}
        source={['Sort 1', 'Sort 2', 'Sort 3']}
      />
      <FilterToolbar.FilterDropdown
        itemToString={item => `Item ${item}`}
        source={['Filter 1', 'Filter 2', 'Filter 3']}
      />
    </FilterToolbar>
  );
}

test('updates the toolbar sort state', async () => {
  // arrange
  const handleStateChangeMock = vi.fn();
  const { getByText } = renderToolbar({ filters: [], sort: 'Sort 3' }, handleStateChangeMock);
  const dropdownSortButton = getByText('Sort 3');
  // action
  await userEvent.click(dropdownSortButton);
  // assert
  expect(within(screen.getByRole('listbox')).getAllByRole('option').length).toEqual(3);
  const sort2 = within(screen.getByRole('listbox')).getByText('Item Sort 2');
  // action
  await userEvent.click(sort2);
  // assert
  expect(handleStateChangeMock).toHaveBeenLastCalledWith({
    filters: [],
    sort: 'Sort 2',
    hasStateChanged: true
  });
});

it('updates the toolbar filter state', async () => {
  // arrange
  const handleStateChangeMock = vi.fn();
  const { getByText } = renderToolbar({ filters: [], sort: 'Sort 3' }, handleStateChangeMock);
  // action
  const dropdownFilterButton = getByText('All');
  await userEvent.click(dropdownFilterButton);
  // assert
  expect(within(screen.getByRole('listbox')).getAllByRole('option').length).toEqual(4);
  // action
  const option2 = within(screen.getByRole('listbox')).getByText('Item Filter 2');
  await userEvent.click(option2);
  // assert
  expect(handleStateChangeMock).toHaveBeenCalledWith({
    filters: ['Filter 2'],
    sort: 'Sort 3',
    hasStateChanged: true
  });
  // action
  const option3 = within(screen.getByRole('listbox')).getByText('Item Filter 3');
  await userEvent.click(option3);
  // assert
  expect(handleStateChangeMock).toHaveBeenLastCalledWith({
    filters: ['Filter 2', 'Filter 3'],
    sort: 'Sort 3',
    hasStateChanged: true
  });
});

it('remove a filter with the dropdown', async () => {
  // arrange
  const handleStateChangeMock = vi.fn();
  const { getByText } = renderToolbar(
    { filters: ['Filter 2', 'Filter 3'], sort: 'Sort 3' },
    handleStateChangeMock
  );
  // action
  const dropdownFilterButton = getByText('2 Items Selected');
  await userEvent.click(dropdownFilterButton);
  const option2 = within(screen.getByRole('listbox')).getByText('Item Filter 2');
  await userEvent.click(option2);
  // assert
  expect(handleStateChangeMock).toHaveBeenCalledWith({
    filters: ['Filter 3'],
    sort: 'Sort 3',
    hasStateChanged: true
  });
});

it('clears all filters', async () => {
  // arrange
  const handleStateChangeMock = vi.fn();
  const { getByText } = renderToolbar(
    { filters: ['Filter 2', 'Filter 3'], sort: 'Sort 3' },
    handleStateChangeMock
  );
  // action
  const dropdownFilterButton = getByText('2 Items Selected');
  await userEvent.click(dropdownFilterButton);
  const clearAllOption = within(screen.getByRole('listbox')).getByText('Item Clear all');
  await userEvent.click(clearAllOption);
  // assert
  expect(handleStateChangeMock).toHaveBeenCalledWith({
    filters: [],
    sort: 'Sort 3',
    hasStateChanged: true
  });
});

it('remove a filter with the pills', async () => {
  // arrange
  const handleStateChangeMock = vi.fn();
  renderToolbar({ filters: ['Filter 2', 'Filter 3'], sort: 'Sort 3' }, handleStateChangeMock);
  // action
  const pills = screen.getAllByTestId('pill');
  await userEvent.click(pills[0]);
  // assert
  expect(handleStateChangeMock).toHaveBeenCalledWith({
    filters: ['Filter 3'],
    sort: 'Sort 3',
    hasStateChanged: true
  });
});
