import React from 'react';
import { render, screen } from '@testing-library/react';

import { Tag } from '../index';
import style from '../styles.css';

describe('GIVEN a Tag', () => {
  describe('WHEN PROP: `label` is used', () => {
    test('THEN the Tag is rendered with the label', () => {
      // arrange
      render(<Tag label="Label" />);
      // assert
      expect(screen.getByText('Label')).toBeInTheDocument();
    });
  });

  describe('WHEN PROP: `className` is used', () => {
    test('THEN the root element has that class name', () => {
      // arrange
      render(<Tag label="Label" className="custom-class" />);
      // assert
      expect(screen.getByText('Label').parentElement).toHaveClass('custom-class');
    });
  });

  describe('AND WHEN PROP: `size` is NOT used', () => {
    test('THEN the Tag size is small', () => {
      // arrange
      render(<Tag label="small" />);
      // assert
      const labelElem = screen.getByLabelText('tag');
      expect(labelElem).toBeInTheDocument();
      expect(labelElem).toHaveClass(style.small);
    });
  });

  describe('AND WHEN PROP: `category` is "1"', () => {
    test('THEN the Tag category is category1', () => {
      // arrange
      render(<Tag category="1" label="Category 1" />);
      // assert
      const labelElem = screen.getByText('Category 1');
      expect(labelElem).toBeInTheDocument();
      expect(labelElem).toHaveClass(style.category1);
    });
  });

  describe('AND WHEN PROP: `category` is NOT used', () => {
    test('THEN the Tag category is category0', () => {
      // arrange
      render(<Tag label="Default Category" />);
      // assert
      const labelElem = screen.getByText('Default Category');
      expect(labelElem).toBeInTheDocument();
      expect(labelElem).toHaveClass(style.category0);
    });
  });
});
