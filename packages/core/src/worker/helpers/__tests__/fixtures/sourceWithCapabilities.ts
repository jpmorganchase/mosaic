import { of } from 'rxjs';
import { pages } from './pages.js';

export default {
  capabilities: { writable: false },
  create: () => of(pages.map(page => ({ ...page })))
};
