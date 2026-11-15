import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { getSnapshotFileConfig } from './loaders/getSnapshotFileConfig.js';

export interface SnapshotIdentity {
  root: string;
  id: string;
}

export function getSnapshotRoot(): string {
  return path.resolve(getSnapshotFileConfig('snapshot').snapshotDir);
}

// React memoization is per request. A process-wide memo would hide a newly
// published generation when the snapshot directory stays the same.
const readIdentity = cache(async (root: string): Promise<string | undefined> => {
  try {
    const value = JSON.parse(await fs.readFile(path.join(root, 'mosaic-snapshot.json'), 'utf8'));
    if (
      value?.version === 1 &&
      typeof value.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)
    ) {
      return value.id;
    }
  } catch {
    // Legacy or invalid metadata must never select a reusable fallback key.
  }
  return undefined;
});

export async function getSnapshotIdentity(): Promise<SnapshotIdentity | undefined> {
  const root = getSnapshotRoot();
  const id = await readIdentity(root);
  return id === undefined ? undefined : { root, id };
}
