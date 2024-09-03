import { describe, test, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { SectionHeading } from '../index';

describe('GIVEN a SectionHeading', () => {
  test('THEN it renders supported levels', () => {
    const { getByRole } = render(<SectionHeading level={6}>TEST</SectionHeading>);
    expect(getByRole('heading', { level: 6 })).toBeInTheDocument();
  });
  test('THEN it does not render unsupported levels', () => {
    expect(() => render(<SectionHeading level={7}>TEST</SectionHeading>)).toThrow(
      'Level 7 not supported, valid levels are 0-6'
    );
  });
  test('THEN it renders headings', () => {
    const { getByText } = render(<SectionHeading level={6}>TEST</SectionHeading>);
    expect(getByText('TEST')).toBeDefined();
  });
});
