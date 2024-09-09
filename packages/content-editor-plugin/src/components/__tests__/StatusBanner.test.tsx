import { describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import * as store from '../../store';
import StatusBanner from '../StatusBanner';

vi.mock('../../store');

describe('GIVEN a StatusBanner ', () => {
  const { usePageState } = store;

  test('THEN it does not report on non-error states', () => {
    usePageState.mockReturnValue({
      pageState: 'WARNING',
      errorMessage: 'some warning'
    });
    // arrange
    render(<StatusBanner />);
    // assert
    expect(screen.queryByText('some warning')).not.toBeInTheDocument();
  });

  test('THEN it does report on error states', () => {
    usePageState.mockReturnValue({
      pageState: 'ERROR',
      errorMessage: 'some error'
    });
    // arrange
    render(<StatusBanner />);
    // assert
    expect(screen.getByText('some error')).toBeDefined();
  });
});
