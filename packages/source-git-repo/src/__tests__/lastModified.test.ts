import path from 'node:path';
import { expect, test, vi } from 'vitest';
import type { Page } from '@jpmorganchase/mosaic-types';
import Repo from '../Repo';
import buildLastModified from '../buildLastModified';

test.each([1, 250])('uses one revision and one bulk query for %i cached pages', async count => {
  const dir = path.resolve('fixture');
  const pages = Array.from({ length: count }, (_, i) => ({
    fullPath: `/docs/page-${i}.mdx`
  })) as Page[];
  const dates = new Map(pages.map(page => [`content${page.fullPath.slice(5)}`, 1000]));
  const repo = {
    dir,
    currentLocalRevision: vi.fn().mockResolvedValue('captured-revision'),
    getLatestCommitDateMap: vi.fn().mockResolvedValue(dates),
    getLatestCommitDate: vi.fn()
  };
  const output = await buildLastModified(
    repo as unknown as Repo,
    path.join(dir, 'content'),
    '/docs',
    pages
  );
  expect(repo.currentLocalRevision).toHaveBeenCalledTimes(1);
  expect(repo.getLatestCommitDateMap).toHaveBeenCalledExactlyOnceWith(
    'content',
    'captured-revision'
  );
  expect(repo.getLatestCommitDate).not.toHaveBeenCalled();
  expect(output.every(page => page.lastModified === 1000)).toBe(true);
});

test('uses the captured revision for missing paths, without mutating input pages', async () => {
  const dir = path.resolve('fixture');
  const pages = [{ fullPath: '/docs/new.mdx' }] as Page[];
  const repo = {
    dir,
    currentLocalRevision: vi.fn().mockResolvedValue('before-head-moves'),
    getLatestCommitDateMap: vi.fn().mockResolvedValue(new Map()),
    getLatestCommitDate: vi.fn().mockResolvedValue(2000)
  };
  expect(
    await buildLastModified(repo as unknown as Repo, path.join(dir, 'content'), '/docs', pages)
  ).toEqual([{ fullPath: '/docs/new.mdx', lastModified: 2000 }]);
  expect(repo.getLatestCommitDate).toHaveBeenCalledExactlyOnceWith(
    'content/new.mdx',
    'before-head-moves'
  );
  expect(pages[0]).not.toHaveProperty('lastModified');
});
