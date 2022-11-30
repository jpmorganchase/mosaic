import React from 'react';
import { render, screen } from '@testing-library/react';

import { Callout } from '../index';
import style from '../styles.css';

describe('GIVEN a Callout', () => {
  describe('WHEN PROP: `title` is used', () => {
    test('THEN the Callout has a title', () => {
      // arrange
      render(<Callout title="A title" />);
      // assert
      expect(screen.getByText('A title')).toBeInTheDocument();
    });
  });
  describe('WHEN PROP: `className` is used', () => {
    test('THEN the root element has that class name', () => {
      // arrange
      render(<Callout title="A title" className="custom-class" />);
      // assert
      expect(screen.getByText('A title').parentElement).toHaveClass('custom-class');
    });
  });
  describe('WHEN PROP: `children` is used', () => {
    test('THEN the children are rendered within the Callout', () => {
      // arrange
      render(
        <Callout title="A title">
          <p id="children-elem">Custom children content</p>
        </Callout>
      );
      // assert
      expect(screen.queryByText('Custom children content')).toBeInTheDocument();
    });
  });

  describe('AND WHEN PROP: `variant` is NOT used', () => {
    test('THEN the Callout title is "Note"', () => {
      // arrange
      render(<Callout />);
      // assert
      const titleElem = screen.getByText('Note');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.noteBorder);
    });
  });

  describe('AND WHEN PROP: `variant` is "caution"', () => {
    test('THEN the Callout title is "Caution"', () => {
      // arrange
      render(<Callout variant="caution" />);
      // assert
      const titleElem = screen.getByText('Caution');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.cautionBorder);
    });
  });

  describe('AND WHEN PROP: `variant` is "important"', () => {
    test('THEN the Callout title is "Important"', () => {
      // arrange
      render(<Callout variant="important" />);
      // assert
      const titleElem = screen.getByText('Important');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.importantBorder);
    });
  });

  describe('AND WHEN PROP: `variant` is "note"', () => {
    test('THEN the Callout title is "Note"', () => {
      // arrange
      render(<Callout variant="note" />);
      // assert
      const titleElem = screen.getByText('Note');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.noteBorder);
    });
  });

  describe('AND WHEN PROP: `variant` is "tip"', () => {
    test('THEN the Callout title is "Tip"', () => {
      // arrange
      render(<Callout variant="tip" />);
      // assert
      const titleElem = screen.getByText('Tip');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.tipBorder);
    });
  });

  describe('AND WHEN PROP: `variant` is "warning"', () => {
    test('THEN the Callout title is "Warning"', () => {
      // arrange
      render(<Callout variant="warning" />);
      // assert
      const titleElem = screen.getByText('Warning');
      expect(titleElem).toBeInTheDocument();
      expect(titleElem.parentElement).toHaveClass(style.warningBorder);
    });
  });
});
