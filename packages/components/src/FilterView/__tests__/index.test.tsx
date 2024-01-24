import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FilterView } from '../FilterView';

interface TestData {
  title: string;
}

function renderFilterView(props = {}) {
  return render(
    <FilterView<TestData>
      filter={(items, filters) => items.filter(item => filters.includes(item.title))}
      itemRenderer={(item, itemIndex) => (
        <label data-mosaic-testid="product" id={item.title} key={`${item.title}-${itemIndex}`}>
          {item.title}
          <button type="button" />
        </label>
      )}
      view={[
        {
          title: 'Product A'
        },
        {
          title: 'Product B'
        }
      ]}
      {...props}
    >
      <FilterView.ResultCount />
      <FilterView.SortDropdown ListProps={{ 'data-mosaic-testid': 'sort-dropdown' }} />
      <FilterView.FilterDropdown
        ListProps={{ 'data-mosaic-testid': 'filter-dropdown' }}
        source={['Product A', 'Product B', 'Product C']}
      />
    </FilterView>
  );
}

test('can filter the view', async () => {
  // arrange
  const { getByText, getByLabelText, queryByLabelText } = renderFilterView();
  const dropdownButton = getByText('All');
  // action
  await userEvent.click(dropdownButton);
  const productA = within(screen.getByTestId('filter-dropdown')).getByText('Product B');
  await userEvent.click(productA);
  // assert
  expect(getByLabelText('result count').textContent).toEqual('1 Result Displayed');
  expect(getByLabelText('Product B')).toBeInTheDocument();
  expect(queryByLabelText('Product A')).not.toBeInTheDocument();
});

test('can sort the view', async () => {
  // arrange
  const { getByText, getByLabelText, getAllByTestId } = renderFilterView();
  let displayedProducts = getAllByTestId('product');
  // assert
  expect(getByLabelText('result count').textContent).toEqual('All Results Displayed');
  expect(displayedProducts[0].getAttribute('id')).toEqual('Product A');
  expect(displayedProducts[1].getAttribute('id')).toEqual('Product B');
  // action
  const dropdownButton = getByText('A-Z');
  await userEvent.click(dropdownButton);
  const sortZA = within(screen.getByTestId('sort-dropdown')).getByText('Descending Z-A');
  await userEvent.click(sortZA);
  // assert
  displayedProducts = getAllByTestId('product');
  expect(displayedProducts[0].getAttribute('id')).toEqual('Product B');
  expect(displayedProducts[1].getAttribute('id')).toEqual('Product A');
});

test('renders no results when filter returns an empty view', async () => {
  // arrange
  const { getByText, getByLabelText, queryByLabelText } = renderFilterView();
  const dropdownButton = getByText('All');
  // action
  await userEvent.click(dropdownButton);
  const productC = within(screen.getByTestId('filter-dropdown')).getByText('Product C');
  await userEvent.click(productC);
  // assert
  expect(queryByLabelText('Product A')).not.toBeInTheDocument();
  expect(queryByLabelText('Product B')).not.toBeInTheDocument();
  expect(getByLabelText('result count').textContent).toEqual('0 Results Displayed');
  expect(getByText('No Results Found')).toBeInTheDocument();
});

test('can use pagination', async () => {
  // arrange
  const view = [...Array(25)].map((_, i) => ({ title: `Product ${String.fromCharCode(65 + i)}` }));

  renderFilterView({ enablePagination: true, itemsPerPage: 5, view });
  let displayedProducts = screen.getAllByTestId('product');
  // assert
  // check we show the expected number of items
  expect(displayedProducts.length).toEqual(5);
  // check we show the expected number of pages
  expect(screen.queryAllByLabelText(/^Page [12345] of 5/).length).toBe(5);
  // check the initial first and last displayed items are the expected items
  expect(displayedProducts[0].id).toBe(view[0].title);
  expect(displayedProducts[displayedProducts.length - 1].id).toBe(view[4].title);
  // action - navigate to the next page
  await userEvent.click(screen.queryAllByLabelText('Next Page')[0]);
  // assert - check the page change shows the expected items
  displayedProducts = screen.getAllByTestId('product');
  expect(displayedProducts[0].id).toBe(view[5].title);
  expect(displayedProducts[displayedProducts.length - 1].id).toBe(view[9].title);
});
