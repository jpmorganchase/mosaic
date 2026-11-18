import { describe, expect, test } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { FormattedContent } from '../FormattedContent';

describe('GIVEN FormattedContent', () => {
  test('THEN headings render without a copy link', () => {
    // arrange
    render(<FormattedContent>{'## What is new\n\n### Details'}</FormattedContent>);
    // assert
    expect(screen.getByRole('heading', { level: 2, name: 'What is new' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Copy link to heading')).not.toBeInTheDocument();
  });

  test('THEN links can be overridden', () => {
    // arrange
    const { container } = render(
      <FormattedContent components={{ a: ({ children }) => <span>{children}</span> }}>
        {'Read [the notes](https://example.com).'}
      </FormattedContent>
    );
    // assert
    expect(screen.getByText('the notes')).toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
  });
});
