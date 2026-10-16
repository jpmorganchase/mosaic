import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { renamePageIfRequested } from '../renamePageIfRequested';
import { resolveInside, stripPrefixDir, toSafeIdentifier } from '../safePaths';

describe('GIVEN resolveInside', () => {
  test('THEN paths inside the root resolve', () => {
    expect(resolveInside('/repo/docs', 'guide/index.mdx')).toBe('/repo/docs/guide/index.mdx');
    expect(resolveInside('/repo/docs', '/guide/index.mdx')).toBe('/repo/docs/guide/index.mdx');
  });

  test.each(['../../.github/workflows/x.yml', 'guide/../../escape.mdx', '..', '', '/'])(
    'THEN %j is rejected',
    relative => {
      expect(resolveInside('/repo/docs', relative)).toBeUndefined();
    }
  );

  test('THEN a sibling folder sharing the root prefix is rejected', () => {
    expect(resolveInside('/repo/docs', '../docs-evil/x.mdx')).toBeUndefined();
  });

  test('THEN backslashes are rejected because they separate paths on Windows', () => {
    expect(resolveInside('/repo/docs', 'guide\\..\\..\\x.mdx')).toBeUndefined();
  });

  test('THEN Windows roots keep their drive and use / separators', () => {
    const root = 'C:\\work\\.mosaic-worktrees\\jdoe\\docs';
    expect(resolveInside(root, 'guide/index.mdx', path.win32)).toBe(
      'C:/work/.mosaic-worktrees/jdoe/docs/guide/index.mdx'
    );
    expect(resolveInside(root, '../../escape.mdx', path.win32)).toBeUndefined();
  });
});

describe('GIVEN stripPrefixDir', () => {
  test('THEN only a leading prefix is removed', () => {
    expect(stripPrefixDir('/mosaic/guide/mosaic/index.mdx', 'mosaic')).toBe(
      'guide/mosaic/index.mdx'
    );
    expect(stripPrefixDir('/docs.v2/index.mdx', 'docs.v2')).toBe('index.mdx');
    expect(stripPrefixDir('mosaic/docs/index.mdx', '/mosaic/docs/')).toBe('index.mdx');
  });

  test.each([
    ['/docsAv2/index.mdx', 'docs.v2'],
    ['/mosaic/new-page.mdx', 'mosaic/docs'],
    ['/mosaic-docs/index.mdx', 'mosaic'],
    ['/mosaic', 'mosaic']
  ])('THEN %j is not under %j', (route, prefixDir) => {
    expect(stripPrefixDir(route, prefixDir)).toBeUndefined();
  });
});

describe('GIVEN toSafeIdentifier', () => {
  test('THEN unsafe characters are replaced', () => {
    expect(toSafeIdentifier('Alice@Corp.com')).toBe('alice-corp.com');
    expect(toSafeIdentifier('../../etc')).toBe('etc');
    expect(toSafeIdentifier('')).toBe('user');
  });
});

describe('GIVEN renamePageIfRequested', () => {
  let repoDir: string;
  let pathOnDisk: string;
  const sendWorkflowProgressMessage = vi.fn();

  beforeEach(async () => {
    repoDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-rename-'));
    await fs.promises.mkdir(path.join(repoDir, 'docs', 'guide'), { recursive: true });
    pathOnDisk = path.join(repoDir, 'docs', 'guide', 'page.mdx');
    await fs.promises.writeFile(pathOnDisk, '# Page');
  });

  afterEach(async () => {
    await fs.promises.rm(repoDir, { recursive: true, force: true });
    sendWorkflowProgressMessage.mockReset();
  });

  const rename = (targetRoute: string) =>
    renamePageIfRequested({
      filePath: '/mosaic/guide/page.mdx',
      targetRoute,
      prefixDir: 'mosaic',
      subfolder: 'docs',
      repoDir,
      pathOnDisk,
      sendWorkflowProgressMessage
    });

  test('THEN a rename inside the source folder moves the file', async () => {
    const result = await rename('/mosaic/guide/renamed.mdx');
    expect(result).toEqual({
      ok: true,
      renamed: true,
      newPathOnDisk: path.join(repoDir, 'docs', 'guide', 'renamed.mdx')
    });
    expect(fs.existsSync(path.join(repoDir, 'docs', 'guide', 'renamed.mdx'))).toBe(true);
  });

  test('THEN a target that climbs out of the source folder is refused', async () => {
    const result = await rename('/mosaic/../../.github/workflows/x.yml');
    expect(result.ok).toBe(false);
    expect(fs.existsSync(pathOnDisk)).toBe(true);
    expect(fs.existsSync(path.join(repoDir, '.github'))).toBe(false);
  });
});
