/**
 *  [[`Breadcrumb`]] defines the breadcrumb for a page
 */
export type Breadcrumb = {
  /** The associated route/path of the breadcrumb */
  path: string;
  /** Whether the breadcrumb is hidden */
  hidden: boolean;
  /** UID */
  id: string;
  /** Breadcrumb label */
  label: string;
};

/**
 *  [[`BreadcrumbsSlice`]] is the associated [[`Breadcrumb`]] items
 */
export type BreadcrumbsSlice = {
  /** Path described in breadcrumbs */
  breadcrumbs: Breadcrumb[];
};
