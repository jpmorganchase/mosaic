import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import { readContentFile } from './contentFiles.js';

/** Undefined only for older content servers/snapshots without creation metadata. */
export async function newPageWritable(folder: string, mode: MosaicMode, contentUrl: string) {
  const file = await readContentFile('mosaic-new-page-sources.json', mode, contentUrl);
  if (!file) return undefined;
  const metadata = JSON.parse(file.text!);
  if (
    metadata?.version !== 1 ||
    !Array.isArray(metadata.sources) ||
    metadata.sources.some(
      source =>
        typeof source?.prefixDir !== 'string' ||
        typeof source.writable !== 'boolean' ||
        (source.prefixDir !== '' &&
          source.prefixDir
            .split('/')
            .some(
              segment => !segment || segment === '.' || segment === '..' || segment.includes('\\')
            ))
    )
  ) {
    throw new Error('Invalid new-page source metadata');
  }
  const route = folder.replace(/^\/+|\/+$/g, '');
  let owner: { prefixDir: string; writable: boolean } | undefined;
  for (const source of metadata.sources) {
    if (
      (source.prefixDir === '' ||
        route === source.prefixDir ||
        route.startsWith(`${source.prefixDir}/`)) &&
      (!owner || source.prefixDir.length > owner.prefixDir.length)
    )
      owner = source;
  }
  return owner?.writable ?? false;
}
