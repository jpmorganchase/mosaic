import { describe, expect, test } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { Image } from '../index';
import components from '../../mdx';

describe('GIVEN an Image', () => {
  test('THEN it wraps the picture in a block-level span, not a div', () => {
    const { container } = render(<Image alt="diagram" src="https://example.com/a.png" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe('SPAN');
    expect(wrapper?.querySelector('img')?.getAttribute('alt')).toBe('diagram');
  });

  test('WHEN rendered as a markdown image inside a paragraph THEN the paragraph contains no div', () => {
    const MarkdownImage = components.img;
    const { container } = render(
      <p>
        Before <MarkdownImage alt="diagram" src="https://example.com/a.png" /> after
      </p>
    );
    const paragraph = container.querySelector('p');
    expect(paragraph?.querySelector('div')).toBeNull();
    expect(paragraph?.querySelector('img')).not.toBeNull();
  });
});
