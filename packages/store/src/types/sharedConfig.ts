import type { AppHeaderSlice } from './appHeader';
import type { FooterSlice } from './footer';

export type SharedConfig = {
  /** Footer props */
  footer?: FooterSlice;
  /** Header props */
  header?: AppHeaderSlice;
  /** Sidebar props */
  sidebar?: Pick<FooterSlice, 'helpLinks'>;
};
