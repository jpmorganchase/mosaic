import { describe, it, expect } from 'vitest';
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
