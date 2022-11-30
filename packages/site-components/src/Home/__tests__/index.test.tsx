import React from 'react';
import { render } from '@testing-library/react';

import { Home } from '../index';

describe('GIVEN a Home component', () => {
  test('THEN it renders children', () => {
    const { getByText } = render(
      <Home>
        <Home.Section>TEST</Home.Section>
      </Home>
    );
    expect(getByText('TEST')).toBeDefined();
  });
});
