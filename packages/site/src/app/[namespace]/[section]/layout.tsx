/**
 * Section layout (`/mosaic/configure/...`).
 *
 * Next.js keeps this layout mounted while the reader navigates within the
 * section, so the section's sidebar tree is sent once here instead of with
 * every page (in `configure` it is ~11 KB per page). Pages read it through
 * `<PageDataDefaults>`, and leave their own copy out when it is the same.
 */
import { resolveMosaicMode } from '@jpmorganchase/mosaic-site-middleware';

import { getSectionSidebar } from '../../../lib/sectionSidebar';
import { PageDataDefaults } from '../../providers';

const NO_DEFAULTS = {};

export default async function SectionLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ namespace: string; section: string }>;
}) {
  const { namespace, section } = await params;
  const { mode, contentUrl } = resolveMosaicMode();
  const sidebarData = await getSectionSidebar(namespace, section, mode, contentUrl);
  return (
    <PageDataDefaults value={sidebarData ? { sidebarData } : NO_DEFAULTS}>
      {children}
    </PageDataDefaults>
  );
}
