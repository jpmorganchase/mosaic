import { describe, expect, test, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

import { Tag } from '../index';
import style from '../styles.css';

describe('GIVEN a Tag', () => {
  test('hydrates children inside a paragraph without repairing the paragraph', async () => {
    const app = (
      <p>
        Available as <Tag>RC</Tag> today.
      </p>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    document.body.appendChild(container);
    const paragraph = container.querySelector('p');
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      expect(container.querySelectorAll('p')).toHaveLength(1);
      expect(paragraph).toHaveTextContent('Available as RC today.');
      await act(async () => {
        root = hydrateRoot(container, app, { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector('p')).toBe(paragraph);
      expect(paragraph?.querySelector('div')).toBeNull();
    } finally {
      if (root) await act(async () => root?.unmount());
      container.remove();
    }
  });

  test.each(['Label', ''])('prefers the explicit label %j over children', label => {
    render(<Tag label={label}>Ignored child</Tag>);
    expect(screen.queryByText('Ignored child')).not.toBeInTheDocument();
    expect(screen.getByLabelText('tag')).toHaveTextContent(label);
  });
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
