import { describe, expect, test } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import * as Heading from '../Heading';

describe('GIVEN a Heading', () => {
  test('THEN a H0 can be rendered', () => {
    // arrange
    render(<Heading.H0>H0</Heading.H0>);
    // assert
    expect(screen.getByText('H0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  test('THEN a H1 can be rendered', () => {
    // arrange
    render(<Heading.H1>H1</Heading.H1>);
    // assert
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  test('THEN a H1 can be rendered', () => {
    // arrange
    render(<Heading.H2>H2</Heading.H2>);
    // assert
    expect(screen.getByText('H2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
  test('THEN a H3 can be rendered', () => {
    // arrange
    render(<Heading.H3>H3</Heading.H3>);
    // assert
    expect(screen.getByText('H3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
  test('THEN a H4 can be rendered', () => {
    // arrange
    render(<Heading.H4>H4</Heading.H4>);
    // assert
    expect(screen.getByText('H4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });
  test('THEN a H5 can be rendered', () => {
    // arrange
    render(<Heading.H5>H5</Heading.H5>);
    // assert
    expect(screen.getByText('H5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });
  test('THEN a H6 can be rendered', () => {
    // arrange
    render(<Heading.H6>H6</Heading.H6>);
    // assert
    expect(screen.getByText('H6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
  });
});
