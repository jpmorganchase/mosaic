/** A reachable snapshot URL and its backing file, independent of SEO policy. */
export interface SnapshotRoute {
  /** URL pathname, with each segment percent-encoded. */
  pathname: string;
  /** Decoded, root-relative filesystem path, retaining its file extension. */
  sourcePathname: string;
}

/** Written before the matching mosaic-snapshot.json completion marker. */
export interface SnapshotRoutes {
  version: 1;
  snapshotId: string;
  routes: SnapshotRoute[];
}
