/**
 * Reads files that plugins write for the whole site, such as
 * `search-records.json` and `llms.txt`, from the snapshot or the
 * active-mode content server, and keeps what's made from them in memory.
 *
 * Next's data cache isn't used: these files can be over its 2 MB limit, and
 * what's made from them, such as a search index, is slow to rebuild.
 *
 * Server-only.
 */
import fs from 'fs';
import path from 'path';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';

import { getSnapshotFileConfig } from './loaders/index.js';

export interface ContentFile {
  /** Changes when the file does. */
  version: string;
  /** Absent when the file hasn't changed since `knownVersion`. */
  text?: string;
}

// FNV-1a: tells whether an active-mode file changed, without keeping a copy.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return `${text.length}-${(value >>> 0).toString(36)}`;
}

/**
 * Reads `file`, a name at the root of the content, such as `llms.txt`.
 * Undefined when there isn't one.
 */
export async function readContentFile(
  file: string,
  mode: MosaicMode,
  contentUrl: string,
  knownVersion?: string
): Promise<ContentFile | undefined> {
  if (mode === 'snapshot-file') {
    const { snapshotDir } = getSnapshotFileConfig(file);
    // Sites include their snapshots with `outputFileTracingIncludes`.
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), snapshotDir, file);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return undefined;
    }
    const version = `${filePath}:${stat.mtimeMs}:${stat.size}`;
    if (version === knownVersion) {
      return { version };
    }
    return { version, text: await fs.promises.readFile(filePath, 'utf8') };
  }
  const response = await fetch(`${contentUrl}/${file}`, { cache: 'no-store' });
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(
      `Failed to load ${file} from ${contentUrl}: ${response.status} ${response.statusText}`
    );
  }
  const text = await response.text();
  return { version: hash(text), text };
}

export interface ContentFileCacheOptions {
  /**
   * Active mode: how long, in milliseconds, to use the loaded file before
   * checking the content server for a new one. Until the check finishes, the
   * loaded file is used. Snapshot mode checks the file's modification time
   * every time.
   */
  maxAge: number;
  /** Await an expired refresh and propagate errors instead of serving stale content. */
  staleWhileRevalidate?: boolean;
}

/**
 * Keeps `parse(file)` in memory, and makes it again when the file changes.
 * Concurrent loads share one request, and a failed active-mode refresh
 * keeps the loaded value.
 */
export function createContentFileCache<T>(
  file: string,
  parse: (text: string) => T,
  { maxAge, staleWhileRevalidate = true }: ContentFileCacheOptions
) {
  let loaded: { version: string; value: T; checkedAt: number } | undefined;
  let pending: Promise<typeof loaded> | undefined;

  const refresh = (mode: MosaicMode, contentUrl: string) => {
    pending ??= (async () => {
      const source = await readContentFile(file, mode, contentUrl, loaded?.version);
      if (!source) {
        loaded = undefined;
      } else if (source.version === loaded?.version || source.text === undefined) {
        loaded = loaded && { ...loaded, checkedAt: Date.now() };
      } else {
        loaded = { version: source.version, value: parse(source.text), checkedAt: Date.now() };
      }
      return loaded;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };

  /** The parsed file, or undefined when there isn't one. Rejects when it can't be loaded. */
  return async function get(mode: MosaicMode, contentUrl: string): Promise<T | undefined> {
    if (mode === 'snapshot-file' || !loaded) {
      return (await refresh(mode, contentUrl))?.value;
    }
    if (Date.now() - loaded.checkedAt >= maxAge) {
      if (!staleWhileRevalidate) return (await refresh(mode, contentUrl))?.value;
      refresh(mode, contentUrl).catch(error => {
        console.warn(`[Mosaic] Couldn't refresh ${file}: ${error}`);
      });
    }
    return loaded.value;
  };
}
