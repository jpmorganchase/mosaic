import { describe, expect, test, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('../useSearchData', () => ({
  useSearchData: () => ({ searchIndex: [], searchConfig: {} })
}));

import { SearchInput } from '../index';

describe('GIVEN a SearchInput', () => {
  test('THEN the input itself is labelled', () => {
    render(<SearchInput />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    expect(input.tagName).toBe('INPUT');
  });
});
