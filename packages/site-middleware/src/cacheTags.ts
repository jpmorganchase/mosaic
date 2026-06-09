/**
 * Cache-tag constants shared by `cachedLoaders.ts` and the
 * `/api/revalidate` route handler.
 *
 * Kept in a standalone, side-effect-free module so the revalidate
 * route can import only this constant without dragging the rest of
 * `cachedLoaders.ts` (fs, path, S3 SDK, gray-matter, dynamic
 * `process.cwd()` calls) into its Next.js NFT trace. Pulling those
 * in caused Turbopack's "whole project was traced unintentionally"
 * warning on build, because the dynamic filesystem calls defeat the
 * static trace.
 */
export const MOSAIC_CONTENT_CACHE_TAG = 'mosaic-content';
