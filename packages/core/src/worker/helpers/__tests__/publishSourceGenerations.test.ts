import type { Page, Plugin, Serialiser } from '@jpmorganchase/mosaic-types';
import { lastValueFrom, Subject } from 'rxjs';
import { expect, test, vi } from 'vitest';
import { publishSourceGenerations } from '../publishSourceGenerations.js';

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => {
    release = resolve;
  });
  return { promise, release };
}

test('keeps each generation together and waits for its publication before processing the next', async () => {
  const firstPlugin = deferred();
  const firstWrite = deferred();
  const source = new Subject<Page[]>();
  const events: string[][] = [];
  const afterSource: Plugin['$afterSource'] = async (pages, { config }) => {
    config.setData({ generation: pages[0].content });
    events.push(['afterSource', pages[0].content]);
    return pages;
  };
  const beforeSend: Plugin['$beforeSend'] = async (filesystem, { config }) => {
    if (config.data.generation === 'A') await firstPlugin.promise;
    const body = String(await filesystem.promises.readFile('/page.mdx'));
    events.push(['beforeSend', String(config.data.generation), body]);
  };
  const serialiser = { serialise: async (_path, page) => Buffer.from(page.content) } as Serialiser;
  const published = lastValueFrom(
    publishSourceGenerations(
      source,
      { namespace: 'fixture', ignorePages: [], pageExtensions: ['.mdx'] },
      serialiser,
      { $afterSource: afterSource, $beforeSend: beforeSend },
      undefined,
      async generation => {
        events.push(['write', String(generation.data.generation), generation.pages['/page.mdx']]);
        if (generation.data.generation === 'A') await firstWrite.promise;
        events.push(['posted', String(generation.data.generation)]);
      }
    )
  );
  source.next([{ fullPath: '/page.mdx', content: 'A' } as Page]);
  source.next([{ fullPath: '/page.mdx', content: 'B' } as Page]);
  source.complete();
  expect(events).toEqual([['afterSource', 'A']]);

  firstPlugin.release();
  await vi.waitFor(() => expect(events.at(-1)).toEqual(['write', 'A', 'A']));
  expect(events).toHaveLength(3);
  firstWrite.release();
  await published;

  expect(events).toEqual([
    ['afterSource', 'A'],
    ['beforeSend', 'A', 'A'],
    ['write', 'A', 'A'],
    ['posted', 'A'],
    ['afterSource', 'B'],
    ['beforeSend', 'B', 'B'],
    ['write', 'B', 'B'],
    ['posted', 'B']
  ]);
});
