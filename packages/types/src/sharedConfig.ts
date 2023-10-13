import type { AppHeaderSlice } from './appHeader.js';
import type { FooterSlice } from './footer.js';

export type SharedConfig = {
  /** Footer props */
  footer?: FooterSlice;
  /** Header props */
  header?: AppHeaderSlice;
  /** Sidebar props */
  sidebar?: Pick<FooterSlice, 'helpLinks'>;
};
