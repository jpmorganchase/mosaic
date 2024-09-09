import { describe, expect, test } from 'vitest';
import React, { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import userEvents from '@testing-library/user-event';
import mockRouter from 'next-router-mock';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider/next-13.5';
import NextLink from 'next/link';
import { LinkProvider } from '@jpmorganchase/mosaic-components';

import { DocPaginator } from '../DocPaginator';

describe('GIVEN a DocPaginator', () => {
  const wrapper: PropsWithChildren<LinkProvider> = ({ children }) => (
    <LinkProvider value={NextLink}>
      <MemoryRouterProvider>{children}</MemoryRouterProvider>
    </LinkProvider>
  );

  test('can change to the next page', async () => {
    // arrange
    const next = {
      title: 'Some Next Page Title',
      route: '/some-next-page'
    };
    render<any>(<DocPaginator linkSuffix="Test Page" next={next} />, {
      wrapper
    });
    // action
    await userEvents.click(screen.getByText('Next Test Page'));
    // assert
    expect(screen.getByText('Some Next Page Title')).toBeInTheDocument();
    expect(mockRouter).toMatchObject({
      pathname: '/some-next-page'
    });
  });

  test('can change to the previous page', async () => {
    // arrange
    const prev = {
      title: 'Some Previous Page Title',
      route: '/some-previous-page'
    };
    render<any>(<DocPaginator linkSuffix="Test Page" prev={prev} />, {
      wrapper
    });
    // action
    await userEvents.click(screen.getByText('Previous Test Page'));
    // assert
    expect(screen.getByText('Some Previous Page Title')).toBeInTheDocument();
    expect(mockRouter).toMatchObject({
      pathname: '/some-previous-page'
    });
  });
});
