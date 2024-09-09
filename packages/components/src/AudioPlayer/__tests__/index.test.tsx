import { describe, expect, test } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { AudioPlayer } from '../index';

describe('GIVEN an Audio Player', () => {
  test('THEN it has a title', () => {
    // arrange
    render(<AudioPlayer src="" title="A title" skipDuration={15} />);
    // assert
    expect(screen.getByText('A title')).toBeInTheDocument();
  });
  test('THEN the audio element has a src attribute defined', () => {
    // arrange
    render(<AudioPlayer src="https://abcd" title="A title" skipDuration={15} />);
    // assert
    expect(screen.getByLabelText('audio')).toHaveAttribute('src', 'https://abcd');
  });
});
