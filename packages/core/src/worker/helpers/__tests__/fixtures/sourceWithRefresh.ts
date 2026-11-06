import { of } from 'rxjs';
import { vi } from 'vitest';
import { pages } from './pages.js';

export const refresh = vi.fn();

export default {
  create: () => of(pages.map(page => ({ ...page }))),
  refresh
};
