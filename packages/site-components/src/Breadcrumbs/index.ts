import { withBreadcrumbsAdapter } from './withBreadcrumbsAdapter';
import { Breadcrumbs as OriginalBreadcrumbs } from './Breadcrumbs';

export type { Breadcrumb } from './Breadcrumb';

export { withBreadcrumbsAdapter } from './withBreadcrumbsAdapter';
export const Breadcrumbs = withBreadcrumbsAdapter(OriginalBreadcrumbs);
