import { Volume, type DirectoryJSON } from 'memfs';
import { concatMap, type Observable } from 'rxjs';
import type {
  IVolumeImmutable,
  Page,
  Plugin,
  Serialiser,
  SourceCapabilities,
  WorkerData
} from '@jpmorganchase/mosaic-types';
import FileAccess from '../../filesystems/FileAccess.js';
import MutableVolume from '../../filesystems/MutableVolume.js';
import createConfig from '../../helpers/createConfig.js';

export interface SourceGeneration {
  pages: DirectoryJSON;
  data: Record<string, unknown>;
  symlinks: ReturnType<IVolumeImmutable['symlinksToJSON']>;
}

export function publishSourceGenerations(
  source: Observable<Page[]>,
  workerData: Pick<WorkerData, 'namespace' | 'ignorePages' | 'pageExtensions'>,
  serialiser: Serialiser,
  pluginApi: Plugin,
  sourceCapabilities: SourceCapabilities | undefined,
  publish: (generation: SourceGeneration) => Promise<void>
) {
  const { namespace, ignorePages, pageExtensions } = workerData;
  const context = { namespace, ignorePages, pageExtensions, serialiser };
  return source.pipe(
    concatMap(async input => {
      // Source metadata also exists when there are no pages.
      const config = createConfig<Record<string, unknown>>({ sourceCapabilities });
      const pages = await pluginApi.$afterSource(input, { ...context, config });
      const mergedPages: DirectoryJSON = {};
      for (const page of pages) {
        mergedPages[page.fullPath] = String(await serialiser.serialise(page.fullPath, page));
      }
      const filesystem = new MutableVolume(new FileAccess(Volume.fromJSON(mergedPages)), namespace);
      let generation: SourceGeneration;
      try {
        await pluginApi.$beforeSend(filesystem.asRestricted(), { ...context, config });
        generation = {
          pages: filesystem.toJSON(),
          data: config.data,
          symlinks: filesystem.symlinksToJSON()
        };
      } finally {
        filesystem.reset();
      }
      // Wait for the durable write and the worker message before advancing.
      await publish(generation);
    })
  );
}
