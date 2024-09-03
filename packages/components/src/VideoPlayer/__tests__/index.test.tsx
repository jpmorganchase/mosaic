import { describe, test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { VideoPlayer } from '../index';

describe('GIVEN a Video Player', () => {
  test('THEN the video element has a src attribute defined', () => {
    // arrange
    render(<VideoPlayer src="abcd" skipDuration={15} />);
    // assert
    expect(screen.getByLabelText('video')).toHaveAttribute('src', 'abcd');
  });
});
