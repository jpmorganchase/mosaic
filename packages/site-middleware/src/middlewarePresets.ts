import type { Redirect } from 'next';
import { SearchIndexSlice, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
import type { ContentProps } from '@jpmorganchase/mosaic-types';
import { withSearchIndex } from './withSearchIndex.js';
import { withSharedConfig } from './withSharedConfig.js';
import { withMDXContent } from './withMDXContent.js';
import { MosaicMiddleware, MosaicMiddlewareWithConfig } from './createMiddlewareRunner.js';
import { withMosaicMode, type MosaicModeProps } from './withMosaicMode.js';

export type BaseMosaicAppProps = {
  /** Flag to show custom 404 page, whilst maintaining current state/layout */
  show404?: boolean;
  /** Flag to show custom 500 page, whilst maintaining current state/layout */
  show500?: boolean;
};

/** Abstract Mosaic App Props */
export type MosaicAppProps<T> = {
  /** Page props created by [[`Middleware`]] */
  props?: T;
  /** Error description */
  errors?: {
    /** Stacktrace * */
    location?: string;
    /** Error message * */
    statusText?: string;
    /** Error code */
    status?: number;
  } & BaseMosaicAppProps;
  /** Next JS Redirect */
  redirect?: Redirect;
};

/** Mosaic getServerSideProps result which supports error handling */
export type GetMosaicServerSidePropsResult<T> = MosaicAppProps<T>;

/** MiddlewarePresets props */
export type MiddlewarePresetsProps = MosaicModeProps &
  ContentProps &
  SearchIndexSlice &
  SharedConfigSlice;

/** A collection of preset [[`Middleware`]] plugins that will compose together the page props */
export const middlewarePresets: Array<
  | MosaicMiddleware<MiddlewarePresetsProps>
  | MosaicMiddlewareWithConfig<MiddlewarePresetsProps, unknown>
> = [withMosaicMode, withSharedConfig, withMDXContent, withSearchIndex];
