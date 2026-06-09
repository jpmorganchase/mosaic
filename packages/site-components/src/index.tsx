export * from './AppHeader';
export * from './AppHeaderControls';
export * from './AppHeaderDrawer';
export * from './AppHeaderTabs';
export * from './BackLink';
export * from './Breadcrumbs';
export * from './BaseUrlProvider';
// `Body` (the legacy `next-mdx-remote`-based renderer) is intentionally
// not re-exported. The App Router site now renders MDX via
// `BodyServer` → `MdxRenderer` (`next-mdx-remote-client`). Deep imports
// still work for any consumer that genuinely needs the legacy component.
export * from './DocPaginator';
export * from './Drawer';
export * from './Footer';
export * from './HTMLView';
export * from './Link';
export * from './Image';
export * from './Metadata';
export * from './PageNavigation';
export * from './Sidebar';
export * from './TableOfContents';
export * from './UserProfile';
export * from './VerticalNavigation';
export * from './404';
export * from './500';

export { default as components } from './mdx';
export { createMDXScope, type MDXScope } from './utils/createMDXScope';
export {
  createMdxRenderer,
  type CreateMdxRendererOptions,
  type MdxRendererProps
} from './MdxHost/createMdxRenderer';
