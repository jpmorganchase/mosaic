import React from 'react';
import { render, screen } from '@testing-library/react';

import { BackLink } from '../index';

describe('GIVEN a BackLink', () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
  test('THEN the children are rendered', () => {
    // arrange
    render(<BackLink label="LABEL" link="https://www.test.com/" />);
    // assert
    const href: string | undefined = screen.getByText('Back to LABEL').closest('a')?.href;
    expect(href).toBe('https://www.test.com/');
  });
});
