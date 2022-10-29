import { isMainThread, parentPort, workerData as unTypedWorkerData } from 'worker_threads';

import path from 'path';
import fs from 'fs';
import { DirectoryJSON, Volume } from 'memfs';
import { switchMap, tap } from 'rxjs';

import type { Page, WorkerData } from '@jpmorganchase/mosaic-types';

import FileAccess from '../filesystems/FileAccess';
import MutableVolume from '../filesystems/MutableVolume';
import createConfig from '../helpers/createConfig';
import { bindPluginMethods, bindSerialiser } from '../plugin';
import createSourceObservable from './helpers/createSourceObservable';

const workerData: WorkerData<{ cache: boolean }> = unTypedWorkerData;

if (isMainThread) {
  throw new Error('This module can only be called from a child process.');
}
(async () => {
  let config;
  let filesystem;
  const serialiser = await bindSerialiser(workerData.serialisers);
  const pluginApi = await bindPluginMethods(workerData.plugins);
  const cachePath = path.join(process.cwd(), '.tmp', '.cache', `${workerData.name}.json`);

  if (workerData.options.cache !== false) {
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  }

  (await createSourceObservable(workerData, serialiser))
    .pipe(
      tap(() => {
        config = createConfig();
      }),
      switchMap((pages: Page[]) =>
        pluginApi.$afterSource(pages, {
          config,
          serialiser,
          ignorePages: workerData.ignorePages,
          pageExtensions: workerData.pageExtensions
        })
      ),
      switchMap((pages: Page[]) =>
        pages.reduce(async (mergedPagesPromise, page) => {
          const mergedPages = await mergedPagesPromise;
          mergedPages[page.fullPath] = String(await serialiser.serialise(page.fullPath, page));
          return mergedPages;
        }, Promise.resolve({}))
      ),
      switchMap(async (mergedPages: DirectoryJSON) => {
        filesystem = new MutableVolume(
          new FileAccess(Volume.fromJSON(mergedPages)),
          workerData.namespace
        );
        await pluginApi.$beforeSend(filesystem.asRestricted(), {
          config,
          ignorePages: workerData.ignorePages,
          pageExtensions: workerData.pageExtensions,
          serialiser
        });
        // In the main thread we would freeze the filesystem here, but since we throw it away after sending it to the parent process,
        // we don't bother freezing
        // Turn data into buffer
        return Buffer.from(
          JSON.stringify({
            pages: filesystem.toJSON(),
            data: config.data,
            symlinks: filesystem.symlinksToJSON()
          })
        );
      }),
      tap(() => {
        // Reset filesystem and config memory
        config = null;
        filesystem.reset();
        filesystem = null;
      })
    )
    .subscribe(async (pagesAndSymlinks: Buffer) => {
      if (workerData.options.cache !== false) {
        console.info(`[PullDocs] Saving cached filesystem of ${workerData.name}`);
        await fs.promises.writeFile(cachePath, pagesAndSymlinks);
      }

      parentPort.postMessage(
        {
          type: 'message',
          data: pagesAndSymlinks
        },
        /* transferList */ [pagesAndSymlinks.buffer]
      );
    });

  if (workerData.options.cache !== false) {
    try {
      if (await fs.promises.stat(cachePath)) {
        const data = await fs.promises.readFile(cachePath);
        console.info(`Restoring cached filesystem for ${workerData.name}`);
        parentPort.postMessage(
          {
            type: 'init',
            data
          },
          /* transferList */ [data.buffer]
        );
      }
      // Important: Return to avoid sending another init signal on L107
      return;
    } catch (e) {
      // Does not exist
    }
  }
  parentPort.postMessage({ type: 'init' });
})();

// Catch any unhandled errors and re-throw them
process.once('uncaughtException', e => {
  throw e;
});

// async function getPagesWithoutContent(pages: DirectoryJSON, serialiser: Serialiser): Promise<DirectoryJSON> {
//   const pagesWithoutContent = {};
//   for (const fullPath in pages) {
//     const serialisedPage = pages[fullPath];
//     const page = await serialiser.deserialise(fullPath, serialisedPage);
//     page.content = '';
//     pagesWithoutContent[fullPath] = String(await serialiser.serialise(fullPath, page));
//   }
//   return pagesWithoutContent;
// }
