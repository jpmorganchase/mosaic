import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

vi.stubGlobal('ResizeObserver', ResizeObserver);

// jsdom doesn't implement scrolling; Salt's list/menu components call it.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

configure({ testIdAttribute: 'data-mosaic-testid' });

afterEach(() => {
  cleanup();
});
