import fs from 'node:fs/promises';
import path from 'node:path';
import type { SnapshotRoute, SnapshotRoutes } from '@jpmorganchase/mosaic-types';
import { getSnapshotRoot } from './snapshotIdentity.js';

export type { SnapshotRoute, SnapshotRoutes };

const ROUTES_FILE = 'mosaic-routes.json';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const regenerate = `Regenerate the snapshot with mosaic build and deploy ${ROUTES_FILE} with its matching mosaic-snapshot.json.`;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function validPath(value: unknown, encoded: boolean): value is string {
  if (typeof value !== 'string' || !value.startsWith('/')) return false;
  if (value === '/') return encoded;
  return value
    .slice(1)
    .split('/')
    .every(segment => {
      let decoded = segment;
      try {
        if (encoded) decoded = decodeURIComponent(segment);
      } catch {
        return false;
      }
      return (
        decoded !== '' &&
        decoded !== '.' &&
        decoded !== '..' &&
        // eslint-disable-next-line no-control-regex
        !/[\\/\x00-\x1f\x7f]/.test(decoded) &&
        (!encoded || encodeURIComponent(decoded) === segment)
      );
    });
}

/** Validate the public, versioned artifact. An empty inventory is valid. */
export function parseSnapshotRoutes(value: unknown, snapshotId?: string): SnapshotRoutes {
  const fail = () => new Error(`Invalid or unsupported ${ROUTES_FILE}. ${regenerate}`);
  if (
    !isObject(value) ||
    !hasKeys(value, ['version', 'snapshotId', 'routes']) ||
    value.version !== 1 ||
    typeof value.snapshotId !== 'string' ||
    !UUID.test(value.snapshotId) ||
    (snapshotId !== undefined && value.snapshotId !== snapshotId) ||
    !Array.isArray(value.routes)
  )
    throw fail();
  const seen = new Set<string>();
  for (const route of value.routes) {
    if (
      !isObject(route) ||
      !hasKeys(route, ['pathname', 'sourcePathname']) ||
      !validPath(route.pathname, true) ||
      !validPath(route.sourcePathname, false) ||
      seen.has(route.pathname)
    )
      throw fail();
    seen.add(route.pathname);
  }
  return value as unknown as SnapshotRoutes;
}

// Keep one parsed generation, bounded independently of requested page URLs.
// Every call reads the completion identity, so a rebuilt root selects new data.
let loaded: { root: string; id: string; value: Promise<SnapshotRoutes> } | undefined;

/** Load a completed snapshot inventory. Legacy snapshots need regeneration. */
export async function loadSnapshotRoutes(snapshotDir?: string): Promise<SnapshotRoutes> {
  const root = path.resolve(snapshotDir ?? getSnapshotRoot());
  let identity: unknown;
  try {
    identity = JSON.parse(await fs.readFile(path.join(root, 'mosaic-snapshot.json'), 'utf8'));
  } catch (error) {
    throw new Error(`Missing or invalid snapshot completion identity at ${root}. ${regenerate}`, {
      cause: error
    });
  }
  if (
    !isObject(identity) ||
    identity.version !== 1 ||
    typeof identity.id !== 'string' ||
    !UUID.test(identity.id)
  ) {
    throw new Error(`Invalid snapshot completion identity at ${root}. ${regenerate}`);
  }
  if (loaded?.root === root && loaded.id === identity.id) return loaded.value;
  const id = identity.id;
  const value: Promise<SnapshotRoutes> = fs
    .readFile(path.join(root, ROUTES_FILE), 'utf8')
    .then(raw => parseSnapshotRoutes(JSON.parse(raw), id))
    .catch(error => {
      if (loaded?.value === value) loaded = undefined;
      throw new Error(`Could not load ${ROUTES_FILE} at ${root}. ${regenerate}`, { cause: error });
    });
  loaded = { root, id, value };
  return value;
}

export interface MosaicStaticParams {
  /** First URL segment; this need not be a source namespace. */
  namespace: string;
  route: string[];
}

export interface MosaicRouteSelection {
  /** Backing file extensions the host can render, e.g. ['.mdx']. Required. */
  pageExtensions: readonly string[];
  /** Optional host routing policy, independent of SEO exclusions. */
  include?: (route: SnapshotRoute) => boolean;
  /** Permit a deliberately empty host. Defaults to false. */
  allowEmpty?: boolean;
}

/** Map inventory entries to decoded Next params. The host owns its '/' route. */
export function mapMosaicStaticParams(
  routes: readonly SnapshotRoute[],
  { pageExtensions, include, allowEmpty = false }: MosaicRouteSelection
): MosaicStaticParams[] {
  if (
    pageExtensions.length === 0 ||
    pageExtensions.some(extension => !/^\.[^./\\]+$/.test(extension))
  ) {
    throw new Error(
      'Static route selection requires supported pageExtensions, for example [".mdx"].'
    );
  }
  const selected = new Map<string, MosaicStaticParams>();
  for (const route of routes) {
    if (!validPath(route.pathname, true) || !validPath(route.sourcePathname, false)) {
      throw new Error(`Invalid route in ${ROUTES_FILE}. ${regenerate}`);
    }
    if (
      route.pathname === '/' ||
      !pageExtensions.some(extension => route.sourcePathname.endsWith(extension)) ||
      (include && !include(route))
    )
      continue;
    const [namespace, ...segments] = route.pathname.slice(1).split('/').map(decodeURIComponent);
    selected.set(route.pathname, { namespace, route: segments });
  }
  if (!selected.size && !allowEmpty) {
    throw new Error(
      `${ROUTES_FILE} selected no renderable routes. Check pageExtensions/include, or set allowEmpty for an intentionally empty host.`
    );
  }
  return [...selected.values()];
}

/** Shared snapshot-only generateStaticParams implementation for App Router hosts. */
export async function generateMosaicStaticParams({
  snapshotDir,
  ...selection
}: MosaicRouteSelection & { snapshotDir?: string }): Promise<MosaicStaticParams[]> {
  return mapMosaicStaticParams((await loadSnapshotRoutes(snapshotDir)).routes, selection);
}
