import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvents from '@testing-library/user-event';
import { VerticalNavigation } from '../VerticalNavigation';

jest.mock('@salt-ds/core/dist-es/navigation-item/NavigationItem.css.js', () => {});

describe('GIVEN a VerticalNavigation', () => {
  it('THEN it should render a button when a group contains < 2 pages', () => {
    const singlePageInGroupMenu = [
      {
        id: 'mosaic/product',
        kind: 'group',
        name: 'Group',
        childNodes: [
          {
            id: 'mosaic/product/index1',
            kind: 'data',
            name: 'Option 1',
            data: { level: 2, link: '/mosaic/product/index1' },
            fullPath: '/mosaic/product/index1.mdx'
          }
        ]
      }
    ];
    // arrange
    render(
      <VerticalNavigation
        menu={singlePageInGroupMenu}
        selectedGroupIds={new Set([])}
        selectedNodeId={'mosaic/product/index1'}
      />
    );
    // assert
    expect(screen.getByText('Group', { exact: true })).toBeVisible();
    expect(screen.queryByLabelText('change page')).toBeInTheDocument();
    expect(screen.queryByLabelText('expand')).not.toBeInTheDocument();
  });

  it('THEN it should render a group when it contains > 2 pages', () => {
    const multiplePagesInGroupMenu = [
      {
        id: 'mosaic/product',
        kind: 'group',
        name: 'Group',
        childNodes: [
          {
            id: 'mosaic/product/index1',
            kind: 'data',
            name: 'Option 1',
            data: { level: 2, link: '/mosaic/product/index1' },
            fullPath: '/mosaic/product/index1.mdx'
          },
          {
            id: 'mosaic/product/index2',
            kind: 'data',
            name: 'Option 2',
            data: { level: 2, link: '/mosaic/product/index2' },
            fullPath: '/mosaic/product/index2.mdx'
          }
        ]
      }
    ];
    // arrange
    render(
      <VerticalNavigation
        menu={multiplePagesInGroupMenu}
        selectedGroupIds={new Set(['mosaic/product'])}
        selectedNodeId={'mosaic/product/index1'}
      />
    );
    // assert
    expect(screen.getByText('Group', { exact: true })).toBeVisible();
    expect(screen.queryByLabelText('expand')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(within(links[0]).getByText('Option 1')).toBeInTheDocument();
    expect(within(links[1]).getByText('Option 2')).toBeInTheDocument();
  });

  it('THEN it expand a group if the page is already selected', async () => {
    const multiplePagesInGroupMenu = [
      {
        id: 'mosaic/product',
        kind: 'group',
        name: 'Group',
        childNodes: [
          {
            id: 'mosaic/product/index1',
            kind: 'data',
            name: 'Option 1',
            data: { level: 2, link: '/mosaic/product/index1' },
            fullPath: '/mosaic/product/index1.mdx'
          },
          {
            id: 'mosaic/product/index2',
            kind: 'data',
            name: 'Option 2',
            data: { level: 2, link: '/mosaic/product/index2' },
            fullPath: '/mosaic/product/index2.mdx'
          }
        ]
      }
    ];
    // arrange
    render(
      <VerticalNavigation
        menu={multiplePagesInGroupMenu}
        selectedGroupIds={new Set(['mosaic/product'])}
        selectedNodeId={'mosaic/product/index1'}
      />
    );
    // assert
    expect(screen.getByText('Group', { exact: true })).toBeVisible();
    expect(screen.queryByLabelText('expand')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toEqual(2);
    expect(within(links[0]).getByText('Option 1')).toBeInTheDocument();
    expect(within(links[1]).getByText('Option 2')).toBeInTheDocument();
  });

  it('THEN it should expand a group when selected', async () => {
    const multiplePagesInGroupMenu = [
      {
        id: 'mosaic/product',
        kind: 'group',
        name: 'Group',
        childNodes: [
          {
            id: 'mosaic/product/index1',
            kind: 'data',
            name: 'Option 1',
            data: { level: 2, link: '/mosaic/product/index1' },
            fullPath: '/mosaic/product/index1.mdx'
          },
          {
            id: 'mosaic/product/index2',
            kind: 'data',
            name: 'Option 2',
            data: { level: 2, link: '/mosaic/product/index2' },
            fullPath: '/mosaic/product/index2.mdx'
          }
        ]
      }
    ];
    // arrange
    render(
      <VerticalNavigation
        menu={multiplePagesInGroupMenu}
        selectedGroupIds={new Set([])}
        selectedNodeId={'mosaic/product/donotexpand'}
      />
    );
    // assert
    expect(screen.getByText('Group', { exact: true })).toBeVisible();
    expect(screen.queryByLabelText('expand')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvents.click(screen.getByLabelText('expand'));
    // action - expand row
    await waitFor(() => expect(screen.queryAllByRole('link').length).toEqual(2));
    // assert
    expect(screen.getByText('Option 1').closest('a')).toHaveAttribute(
      'href',
      '/mosaic/product/index1'
    );
    expect(screen.getByText('Option 2').closest('a')).toHaveAttribute(
      'href',
      '/mosaic/product/index2'
    );
    await waitFor(() => expect(screen.queryAllByRole('link').length).toEqual(2));
    // action - collapse row
    await userEvents.click(screen.getByLabelText('expand'));
    // assert
    await waitFor(() => expect(screen.queryAllByRole('link').length).toEqual(0));
  });
});
