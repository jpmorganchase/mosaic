import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

vi.stubGlobal('ResizeObserver', ResizeObserver);

configure({ testIdAttribute: 'data-mosaic-testid' });

vi.mock('zustand');

afterEach(() => {
  cleanup();
});
