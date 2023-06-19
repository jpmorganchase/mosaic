import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvents from '@testing-library/user-event';

import { H1 } from '../index';

describe('GIVEN an AnchoredHeading', () => {
  describe('WHEN rendered', () => {
    test('THEN the Heading is rendered', () => {
      // arrange
      render(<H1 LinkProps={{ link: 'http://example.com' }}>Mosaic Heading</H1>);
      // assert
      expect(screen.getByText('Mosaic Heading')).toBeInTheDocument();
    });
  });
  describe('WHEN clicked', () => {
    test('THEN the Heading is copied to the clipboard', async () => {
      // arrange
      let clipboardData = ''; // initalizing clipboard data so it can be used in testing
      const mockClipboard = {
        writeText: jest.fn(data => {
          clipboardData = data;
        }),
        readText: jest.fn(() => clipboardData)
      };
      (global.navigator as any).clipboard = mockClipboard;

      render(
        <H1 LinkProps={{ link: 'http://example.com', title: 'Mosaic Title' }}>Mosaic Heading</H1>
      );
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText('click to copy anchor link to clipboard')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Mosaic Heading')).toBeInTheDocument();
      // act
      await userEvents.hover(screen.getByTitle('Mosaic Title'));
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('click to copy anchor link to clipboard')).toBeInTheDocument();
      // act
      await userEvents.click(screen.getByTitle('Mosaic Title'));
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).toBeInTheDocument();
      expect(
        screen.queryByLabelText('click to copy anchor link to clipboard')
      ).not.toBeInTheDocument();
    });
  });
});
