/**
 * Mosaic mode dictates how content is loaded
 *
 * `active`
 * In this mode, content is pulled from configured data sources and updates in real-time.
 * After content is updated, Mosaic plugins create an enhanced, in-memory file object, representing the content
 *
 * `snapshot-file`
 * In this mode, previously created snapshot files are loaded from a local directory.
 *
 * `snapshot-s3`
 * In this mode, previously created snapshot files are loaded from an S3 bucket.
 *
 * (A snapshot is an immutable/persisted copy of `active` content, created separately)
 */
export type MosaicMode = 'active' | 'snapshot-file' | 'snapshot-s3';
