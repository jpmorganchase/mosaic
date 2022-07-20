import { parentPort, isMainThread, workerData as unTypedWorkerData } from 'worker_threads';

import path from 'path';
import fs from 'fs';
import { map, tap, switchMap } from 'rxjs';
import { Volume } from 'memfs';

import type WorkerData from '@pull-docs/types/dist/WorkerData';
import type Page from '@pull-docs/types/dist/Page';

import createSourceObservable from './helpers/createSourceObservable';
import { bindSerialiser, bindPluginMethods } from '../plugin';
import createConfig from '../helpers/createConfig';
import FileAccess from '../filesystems/FileAccess';
import MutableVolume from '../filesystems/MutableVolume';

const workerData: WorkerData<{ cache: boolean }> = unTypedWorkerData;

if (isMainThread) {
  throw new Error('This module can only be called from a child process.');
}
(async () => {
  let config;
  const serialiser = await bindSerialiser(workerData.serialisers);
  const pluginApi = await bindPluginMethods(workerData.plugins);
  const cachePath = path.join(process.cwd(), '.tmp', '.cache', `${workerData.name}.json`);

  let cachedFs;

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
      switchMap(pages =>
        pages.reduce(async (mergedPagesPromise, page) => {
          const mergedPages = await mergedPagesPromise;
          mergedPages[page.fullPath] = String(await serialiser.serialise(page.fullPath, page));
          return mergedPages;
        }, Promise.resolve({}))
      ),
      map(mergedPages => {
        const filesystem = new MutableVolume(
          new FileAccess(Volume.fromJSON(mergedPages)),
          workerData.namespace
        );
        return filesystem;
      }),
      switchMap(async (filesystem: MutableVolume) => {
        await pluginApi.$beforeSend(filesystem.asRestricted(), {
          config,
          ignorePages: workerData.ignorePages,
          pageExtensions: workerData.pageExtensions,
          serialiser
        });
        // In the main thread we would freeze the filesystem here, but since we throw it away after sending it to the parent process,
        // we don't bother freezing
        return { pages: filesystem.toJSON(), symlinks: filesystem.symlinksToJSON() };
      })
    )
    .subscribe(async pagesAndSymlinks => {
      parentPort.postMessage({
        type: 'message',
        data: {
          symlinks: pagesAndSymlinks.symlinks,
          pages: pagesAndSymlinks.pages,
          data: config.data
        }
      });

      await fs.promises.mkdir(path.join(process.cwd(), '.tmp', '.cache'), { recursive: true });
      if (workerData.options.cache !== false) {
        console.info(`Saving cached filesystem of ${workerData.name}`);
        await fs.promises.writeFile(
          cachePath,
          JSON.stringify({
            symlinks: pagesAndSymlinks.symlinks,
            pages: pagesAndSymlinks.pages,
            data: config.data
          })
        );
      }
    });

  if (workerData.options.cache !== false) {
    try {
      if (await fs.promises.stat(cachePath)) {
        cachedFs = JSON.parse(String(await fs.promises.readFile(cachePath)));
        console.info(`Restoring cached filesystem for ${workerData.name}`);
        parentPort.postMessage({
          type: 'init',
          data: {
            symlinks: cachedFs.symlinks,
            pages: cachedFs.pages,
            data: cachedFs.data
          }
        });
      }
      // Important: Return if all went well to avoid sending another init signal
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
