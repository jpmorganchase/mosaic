import { of } from 'rxjs';
import { pages } from './pages.js';

export default {
  create: () => of(pages.map(page => ({ ...page })))
};
