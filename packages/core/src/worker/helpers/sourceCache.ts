import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { inspect } from 'node:util';
import type { WorkerData } from '@jpmorganchase/mosaic-types';

/** Isolate cache entries across namespaces and source/plugin configurations. */
export function getSourceCacheKey(workerData: WorkerData) {
  return createHash('sha256')
    .update(
      inspect(workerData, {
        sorted: true,
        depth: null,
        maxArrayLength: null,
        maxStringLength: null
      })
    )
    .digest('hex');
}

export async function loadSourceCache(filePath: string): Promise<ArrayBuffer | undefined> {
  try {
    const raw = await readFile(filePath);
    const { pages, data, symlinks } = JSON.parse(raw.toString('utf8'));
    if (
      [pages, data, symlinks].some(
        value => !value || typeof value !== 'object' || Array.isArray(value)
      )
    ) {
      return undefined;
    }
    // Copy into a dedicated buffer that is safe to transfer to the parent.
    return new Uint8Array(raw).buffer;
  } catch {
    return undefined;
  }
}

export async function writeSourceCache(filePath: string, encoded: Uint8Array): Promise<void> {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, encoded);
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}
