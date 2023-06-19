import React from 'react';
import { render, screen } from '@testing-library/react';

import { H0, H1, H2, H3, H4, H5, H6 } from '../index';

describe('GIVEN a Heading', () => {
  test('THEN a H0 can be rendered', () => {
    // arrange
    render(<H0>H0</H0>);
    // assert
    expect(screen.getByText('H0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  test('THEN a H1 can be rendered', () => {
    // arrange
    render(<H1>H1</H1>);
    // assert
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  test('THEN a H1 can be rendered', () => {
    // arrange
    render(<H2>H2</H2>);
    // assert
    expect(screen.getByText('H2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
  test('THEN a H3 can be rendered', () => {
    // arrange
    render(<H3>H3</H3>);
    // assert
    expect(screen.getByText('H3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
  test('THEN a H4 can be rendered', () => {
    // arrange
    render(<H4>H4</H4>);
    // assert
    expect(screen.getByText('H4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });
  test('THEN a H5 can be rendered', () => {
    // arrange
    render(<H5>H5</H5>);
    // assert
    expect(screen.getByText('H5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });
  test('THEN a H6 can be rendered', () => {
    // arrange
    render(<H6>H6</H6>);
    // assert
    expect(screen.getByText('H6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
  });
});
