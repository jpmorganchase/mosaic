import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LinkButton } from '../LinkButton';

describe('GIVEN a LinkButton', () =>
  it('THEN it should render as an anchor', () => {
    // arrange
    render(<LinkButton href="http://my/link">My LinkButton</LinkButton>);

    // assert
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByText('My LinkButton').closest('a')).toHaveAttribute(
      'href',
      'http://my/link'
    );
  }));
