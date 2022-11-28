import type { AppHeaderSlice } from './appHeader';
import type { FooterSlice } from './footer';
import type { SidebarSlice } from './sidebar';

export type SharedConfig = {
  /** Footer props */
  footer?: FooterSlice;
  /** Header props */
  header?: AppHeaderSlice;
  /** Sidebar props */
  sidebar?: SidebarSlice;
};

export type SharedConfigSlice = {
  sharedConfig: SharedConfig;
};
