import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('GIVEN a Button with no href property', () =>
  it('THEN it should render as a button', () => {
    // arrange
    render(<Button>My Button</Button>);

    // assert
    expect(screen.getByText('My Button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  }));

describe('GIVEN a Button with a href property', () =>
  it('THEN it should render as a link', () => {
    // arrange
    render(<Button href="http://my/link">My Button with href</Button>);

    // assert
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByText('My Button with href').closest('a')).toHaveAttribute(
      'href',
      'http://my/link'
    );
  }));
