import type { Breadcrumb } from './breadcrumbs';

/**
 *  [[`MetaSlice`]] specifies the page's head metadata
 */
export type MetaSlice = {
  /** Page description */
  description?: string;
  /** Page breadcrumbs */
  breadcrumbs?: Breadcrumb[];
  /** Page title */
  title?: string;
  /** Last modified */
  lastModified?: string;
};
