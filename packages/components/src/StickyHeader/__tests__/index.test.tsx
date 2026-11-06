import { afterEach, expect, test, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import { StickyHeader } from '../index';

afterEach(() => {
  vi.restoreAllMocks();
});

test('StickyHeader removes the same scroll listener it added when it unmounts', () => {
  const addEventListener = vi.spyOn(window, 'addEventListener');
  const removeEventListener = vi.spyOn(window, 'removeEventListener');

  const { unmount } = render(<StickyHeader>Header</StickyHeader>);
  const scrollListener = addEventListener.mock.calls.find(([type]) => type === 'scroll')?.[1];
  expect(scrollListener).toBeTypeOf('function');

  unmount();

  expect(removeEventListener).toHaveBeenCalledWith('scroll', scrollListener);
});
