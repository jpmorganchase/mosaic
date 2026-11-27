import { fileURLToPath } from 'node:url';
import type { Page } from '@jpmorganchase/mosaic-types';
import { firstValueFrom, Subject } from 'rxjs';
import { describe, expect, test } from 'vitest';

import createSourceObservable, {
  getSourceDefinitionExports,
  getSourceRefresh
} from '../createSourceObservable.js';
import { refresh } from './fixtures/sourceWithRefresh.js';

function workerData(fixture: string) {
  return {
    modulePath: fileURLToPath(new URL(`./fixtures/${fixture}.ts`, import.meta.url)),
    name: fixture,
    namespace: 'docs',
    options: {},
    pageExtensions: ['.mdx'],
    ignorePages: ['shared-config.json'],
    schedule: { checkIntervalMins: 30, initialDelayMs: 0 }
  };
}

async function loadFixture(fixture: string) {
  const data = workerData(fixture);
  return { api: await getSourceDefinitionExports(data.modulePath), data: data as never };
}

describe('GIVEN createSourceObservable', () => {
  test('THEN source capability metadata is available before reading any pages', async () => {
    let capabilities: unknown;
    const { api, data } = await loadFixture('sourceWithCapabilities');
    createSourceObservable(api, data, {}, value => {
      capabilities = value;
    });
    expect(capabilities).toEqual({ writable: false });
  });
  test('THEN capabilities written into page content are removed when the source declares none', async () => {
    const { api, data } = await loadFixture('sourceWithoutCapabilities');
    const source$ = createSourceObservable(api, data, {});

    const [page] = await firstValueFrom(source$);

    expect(page).not.toHaveProperty('sourceCapabilities');
  });

  test("THEN the source's declared capabilities replace any written into page content", async () => {
    const { api, data } = await loadFixture('sourceWithCapabilities');
    const source$ = createSourceObservable(api, data, {});

    const [page] = await firstValueFrom(source$);

    expect(page.sourceCapabilities).toEqual({ writable: false });
  });

  test("THEN the source's refresh hook is bound to its options", async () => {
    const { api } = await loadFixture('sourceWithRefresh');

    const sourceRefresh = getSourceRefresh(api, { branch: 'main' } as never);
    await sourceRefresh?.();

    expect(refresh).toHaveBeenCalledWith({ branch: 'main' });
  });

  test('THEN there is no refresh hook when the source does not implement one', async () => {
    const { api } = await loadFixture('sourceWithoutCapabilities');
    expect(getSourceRefresh(api, {} as never)).toBeUndefined();
  });

  test('THEN the worker can subscribe in time for the initial hot emission', async () => {
    const api = {
      create() {
        const source = new Subject<Page[]>();
        queueMicrotask(() => {
          source.next([{ fullPath: '/first.mdx' }]);
          source.complete();
        });
        return source;
      }
    };

    const pages = createSourceObservable(api, workerData('hot') as never, {});

    await expect(firstValueFrom(pages)).resolves.toEqual([
      expect.objectContaining({ fullPath: '/first.mdx' })
    ]);
  });
});
