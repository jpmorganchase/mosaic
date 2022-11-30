import { withSidebarAdapter } from './withSidebarAdapter';
import { VerticalNavigation as OriginalVerticalNavigation } from './VerticalNavigation';

export type { SidebarItem } from './VerticalNavigation';

export { withSidebarAdapter } from './withSidebarAdapter';
export const VerticalNavigation = withSidebarAdapter(OriginalVerticalNavigation);
