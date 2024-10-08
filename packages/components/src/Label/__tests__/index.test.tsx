import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from '../index';

describe('GIVEN a Label with no tooltip', () =>
  it('THEN it should render as a label', () => {
    // arrange
    render(<Label>My Label</Label>);

    // assert
    expect(screen.getByText('My Label')).toBeInTheDocument();
  }));

describe('GIVEN a Label with a tooltip', () =>
  it('THEN it should render as a label with a tooltip', () => {
    // arrange
    render(
      <Label aria-label="My Tooltip Label" tooltip="My Tooltip" TooltipProps={{ open: true }}>
        My Label
      </Label>
    );

    // assert
    expect(screen.getByText('My Label')).toBeInTheDocument();
    expect(screen.getByLabelText('My Tooltip Label')).toBeInTheDocument();
    expect(screen.getByText('My Tooltip')).toBeInTheDocument();
  }));
