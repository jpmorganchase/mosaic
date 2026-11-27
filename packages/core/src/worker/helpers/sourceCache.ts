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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSymlink(value: unknown) {
  if (!isRecord(value)) return false;
  const { target, type } = value;
  return (
    typeof target === 'string' &&
    (type === undefined || type === 'file' || type === 'dir' || type === 'junction')
  );
}

export async function loadSourceCache(filePath: string): Promise<ArrayBuffer | undefined> {
  try {
    const raw = await readFile(filePath);
    const { pages, data, symlinks } = JSON.parse(raw.toString('utf8'));
    if (
      !isRecord(pages) ||
      !isRecord(data) ||
      !isRecord(symlinks) ||
      Object.values(pages).some(page => page !== null && typeof page !== 'string') ||
      Object.values(symlinks).some(links => !Array.isArray(links) || !links.every(isSymlink))
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
