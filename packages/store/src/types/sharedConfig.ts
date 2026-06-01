import type { SourceCapabilities } from '@jpmorganchase/mosaic-types';
import type { AppHeaderSlice } from './appHeader';
import type { FooterSlice } from './footer';

export type SharedConfig = {
  /** Footer props */
  footer?: FooterSlice;
  /** Header props */
  header?: AppHeaderSlice;
  /** Sidebar props */
  sidebar?: Pick<FooterSlice, 'helpLinks'>;
  /**
   * Capability flags of the source that owns this route. Surfaced
   * by `SharedConfigPlugin` from the source module's `capabilities`
   * export. Consumers (notably the editor toolbar) gate features on
   * fields like `writable`; an absent value means defaults apply
   * (currently: nothing opted in).
   */
  sourceCapabilities?: SourceCapabilities;
};

export type SharedConfigSlice = {
  sharedConfig?: SharedConfig;
};
