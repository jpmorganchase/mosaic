import { isMainThread, parentPort, workerData as unTypedWorkerData } from 'worker_threads';

import path from 'path';
import fs from 'fs';

import type { PluginErrors, SourceCapabilities, WorkerData } from '@jpmorganchase/mosaic-types';

import { bindPluginMethods, bindSerialiser } from '../plugin/index.js';
import createSourceObservable, { getSourceRefresh } from './helpers/createSourceObservable.js';
import { publishSourceGenerations } from './helpers/publishSourceGenerations.js';
import { getSourceCacheKey, loadSourceCache, writeSourceCache } from './helpers/sourceCache.js';

const trackPluginErrors = (errors: PluginErrors, lifecycleMethod: string) => {
  const errorsBuffer = Buffer.from(JSON.stringify({ errors, lifecycleMethod }));
  parentPort.postMessage({
    type: 'track',
    data: errorsBuffer
  });
};

const workerData: WorkerData<{ cache: boolean }> = unTypedWorkerData;

if (isMainThread) {
  throw new Error('This module can only be called from a child process.');
}
(async () => {
  const serialiser = await bindSerialiser(workerData.serialisers);
  const pluginApi = await bindPluginMethods(workerData.plugins, trackPluginErrors);
  const cachePath =
    workerData.options.cache === false
      ? undefined
      : path.join(process.cwd(), '.tmp', '.cache', `${getSourceCacheKey(workerData)}.json`);
  if (cachePath) await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });

  let sourceCapabilities: SourceCapabilities | undefined;
  const pages = await createSourceObservable(workerData, serialiser, value => {
    sourceCapabilities = value;
  });

  // `Source.refresh()` in the main thread asks the source to check for
  // changes now. Any changed pages arrive through the pipeline above; the
  // reply only says whether the check ran.
  const refresh = await getSourceRefresh(workerData);
  parentPort.on('message', async (message: { type?: string; id?: number }) => {
    if (message?.type !== 'refresh') return;
    const reply = (result: { refreshed: boolean } | { error: string }) =>
      parentPort.postMessage({ type: 'refresh', data: { id: message.id, ...result } });
    if (!refresh) {
      reply({ refreshed: false });
      return;
    }
    try {
      await refresh();
      reply({ refreshed: true });
    } catch (e) {
      reply({ error: e instanceof Error ? e.message : String(e) });
    }
  });
  // Listening for messages would otherwise keep a worker alive after its
  // source has finished.
  parentPort.unref();

  // Send bootstrap before subscribing: a synchronous source must never send
  // a fresh update before cached startup has been queued in the parent.
  const cached = cachePath && (await loadSourceCache(cachePath));
  if (cached) {
    console.info(`[Mosaic][Core] Restoring cached filesystem for ${workerData.name}`);
    parentPort.postMessage({ type: 'init', data: new Uint8Array(cached) }, [cached]);
  } else {
    parentPort.postMessage({ type: 'init' });
  }

  const encoder = new TextEncoder();
  publishSourceGenerations(
    pages,
    workerData,
    serialiser,
    pluginApi,
    sourceCapabilities,
    async generation => {
      const data = encoder.encode(JSON.stringify(generation));
      if (cachePath) await writeSourceCache(cachePath, data);
      parentPort.postMessage({ type: 'message', data }, [data.buffer]);
    }
  ).subscribe({
    error: err => {
      // Make the source failure visible to the parent worker subscription.
      process.stderr.write(
        `[Mosaic][Core] Worker '${workerData.name}' pipeline errored: ${
          err instanceof Error ? err.stack ?? err.message : String(err)
        }\n`
      );
      throw err instanceof Error ? err : new Error(String(err));
    }
  });
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
