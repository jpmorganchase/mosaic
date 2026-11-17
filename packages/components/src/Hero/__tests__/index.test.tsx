import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { Hero } from '../index';

describe('GIVEN a Hero component', () => {
  test('THEN it can render a datestamp and change the label', () => {
    // arrange
    const testDate = '03/02/2020 20:00:00';
    vi.spyOn(Date.prototype, 'toLocaleString').mockReturnValue(testDate);
    // act
    const { getByText, getByLabelText } = render(
      <Hero datestamp={testDate} datestampLabel="Last TESTED" />
    );
    // expect
    expect(getByLabelText('Last TESTED:')).toBeDefined();
    expect(getByText(testDate)).toBeDefined();
  });
});

describe('GIVEN a Hero with a title, description and links', () => {
  test('THEN only the title is exposed as a heading', () => {
    const { getAllByRole } = render(
      <Hero
        title="Welcome"
        description="Some description"
        links={[{ label: 'Start', url: '/start' }]}
      />
    );
    const headings = getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe('H1');
    expect(headings[0]).toHaveAccessibleName('Welcome');
  });
});
