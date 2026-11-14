// Keep the reference host's imports stable; document and alias context is
// shared with other hosts through the published middleware package.
export {
  MAX_INTERNAL_REDIRECT_HOPS,
  canonicalRoute,
  isFolderIndexRedirect,
  resolveContent,
  type ResolvedContent
} from '@jpmorganchase/mosaic-site-middleware';
