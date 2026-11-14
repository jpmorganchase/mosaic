/**
 * `createSearchHandler`: loading `search-records.json` from a snapshot or
 * the content server, keeping the index in memory, and the query API.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SearchRecord, SearchRecordsFile } from '@jpmorganchase/mosaic-types';

import { createSearchHandler, loadSearchRecords } from '../searchHandler.js';

const record = (route: string, title: string, text = ''): SearchRecord => ({
  id: route,
  route,
  title,
  headings: [],
  text,
  namespace: route.split('/')[1]
});
const file = (...records: SearchRecord[]): SearchRecordsFile => ({ version: 1, records });

const request = (query: string) => new Request(`http://localhost/api/search?${query}`);
const search = async (handler: ReturnType<typeof createSearchHandler>, query: string) => {
  const response = await handler(request(query));
  return { status: response.status, body: await response.json() };
};
const hrefs = (body: { results: { href: string }[] }) => body.results.map(result => result.href);

describe('snapshot-file mode', () => {
  let root: string;
  let recordsFile: string;

  const write = (records: SearchRecordsFile | string, mtime: Date) => {
    fs.writeFileSync(recordsFile, typeof records === 'string' ? records : JSON.stringify(records));
    fs.utimesSync(recordsFile, mtime, mtime);
  };

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-search-handler-'));
    recordsFile = path.join(root, 'search-records.json');
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), root));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('searches the records', async () => {
    write(
      file(
        record('/salt/components/button', 'Button', 'Press it.'),
        record('/mosaic/components/button', 'Button'),
        record('/salt/components/tabs', 'Tabs')
      ),
      new Date(1_000_000)
    );
    const handler = createSearchHandler({ mode: 'snapshot-file' });

    const { status, body } = await search(handler, 'q=buton&namespace=mosaic');
    expect(status).toBe(200);
    expect(body.query).toBe('buton');
    expect(hrefs(body)).toEqual(['/mosaic/components/button', '/salt/components/button']);
    expect(body.results[1]).toMatchObject({ title: 'Button', snippet: 'Press it.' });

    expect(hrefs((await search(handler, 'q=button&namespaces=salt,other')).body)).toEqual([
      '/salt/components/button'
    ]);
    expect(hrefs((await search(handler, 'q=button&limit=1')).body)).toHaveLength(1);
  });

  test('loads new records when the file changes', async () => {
    write(file(record('/salt/components/tabs', 'Tabs')), new Date(1_000_000));
    const handler = createSearchHandler({ mode: 'snapshot-file' });
    expect(hrefs((await search(handler, 'q=tabs')).body)).toEqual(['/salt/components/tabs']);

    write(file(record('/salt/components/tabs-next', 'Tabs')), new Date(2_000_000));
    expect(hrefs((await search(handler, 'q=tabs')).body)).toEqual(['/salt/components/tabs-next']);
  });

  test('answers an empty query without loading the records', async () => {
    fs.rmSync(recordsFile, { force: true });
    const handler = createSearchHandler({ mode: 'snapshot-file' });
    expect(await search(handler, 'q=%20')).toEqual({
      status: 200,
      body: { query: ' ', results: [] }
    });
  });

  test('responds 404 without records, and 503 when they are invalid', async () => {
    fs.rmSync(recordsFile, { force: true });
    const handler = createSearchHandler({ mode: 'snapshot-file' });
    expect(await search(handler, 'q=tabs')).toEqual({
      status: 404,
      body: { error: 'search-records-not-found' }
    });
    expect(await loadSearchRecords('snapshot-file', '')).toBeUndefined();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    write('{"version":2}', new Date(3_000_000));
    expect(await search(handler, 'q=tabs')).toEqual({
      status: 503,
      body: { error: 'search-unavailable' }
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported'));
    errorSpy.mockRestore();
  });
});

describe('active mode', () => {
  const contentUrl = 'http://content.test';
  let served: SearchRecordsFile;
  const fetchMock = vi.fn(async (url: string) => {
    expect(url).toBe(`${contentUrl}/search-records.json`);
    return new Response(JSON.stringify(served));
  });

  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test('reuses the index until maxAge, then refreshes it in the background', async () => {
    served = file(record('/dp/apis', 'APIs'));
    let now = 0;
    const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const handler = createSearchHandler({ mode: 'active', contentUrl, maxAge: 1000 });

    expect(hrefs((await search(handler, 'q=apis')).body)).toEqual(['/dp/apis']);
    now = 500;
    await search(handler, 'q=apis');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    served = file(record('/dp/apis-v2', 'APIs'));
    now = 1500;
    // Stale: answered from the old index while the new records load.
    expect(hrefs((await search(handler, 'q=apis')).body)).toEqual(['/dp/apis']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.waitFor(async () =>
      expect(hrefs((await search(handler, 'q=apis')).body)).toEqual(['/dp/apis-v2'])
    );
    dateSpy.mockRestore();
  });

  test('keeps the old index when a refresh fails', async () => {
    served = file(record('/dp/apis', 'APIs'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handler = createSearchHandler({ mode: 'active', contentUrl, maxAge: 0 });
    await search(handler, 'q=apis');

    fetchMock.mockImplementationOnce(async () => new Response('down', { status: 502 }));
    expect(hrefs((await search(handler, 'q=apis')).body)).toEqual(['/dp/apis']);
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('502')));
    warnSpy.mockRestore();
  });

  test('responds 503 when the content server fails before records load', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockImplementationOnce(async () => new Response('down', { status: 502 }));
    const handler = createSearchHandler({ mode: 'active', contentUrl });
    expect((await search(handler, 'q=apis')).status).toBe(503);
    errorSpy.mockRestore();
  });

  test('loadSearchRecords returns the records', async () => {
    served = file(record('/dp/apis', 'APIs'));
    expect(await loadSearchRecords('active', contentUrl)).toEqual(served);
  });
});
