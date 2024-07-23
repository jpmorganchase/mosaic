import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvents from '@testing-library/user-event';
import { VerticalNavigation } from '../VerticalNavigation';

describe('GIVEN a VerticalNavigation', () => {
  it('THEN it should render a link when a group contains < 2 pages and be active when on its subroute', () => {
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
    expect(screen.queryByRole('link', { name: 'Group' })).toHaveClass('saltNavigationItem-active');
    expect(screen.queryByRole('link', { name: 'Option 1' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Group' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Group' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Group' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvents.click(screen.getByRole('button', { name: 'Group' }));
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
    await userEvents.click(screen.getByRole('button', { name: 'Group' }));
    // assert
    await waitFor(() => expect(screen.queryAllByRole('link').length).toEqual(0));
  });
});
