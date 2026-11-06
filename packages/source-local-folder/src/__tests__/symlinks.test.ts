import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import LocalFolderSource from '../index';

const serialiser = {
  deserialise: async (fullPath: string, data: Buffer) => ({ fullPath, content: data.toString() }),
  serialise: async () => Buffer.from('')
};

describe('GIVEN a local folder containing symlinks', () => {
  let workDir: string;
  let rootDir: string;

  beforeEach(async () => {
    workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-local-folder-'));
    rootDir = path.join(workDir, 'docs');
    await fs.promises.mkdir(path.join(rootDir, 'guide'), { recursive: true });
    await fs.promises.writeFile(path.join(rootDir, 'guide', 'page.mdx'), '# Page');
    await fs.promises.writeFile(path.join(workDir, 'secret.mdx'), 'TOP SECRET');
    await fs.promises.mkdir(path.join(workDir, 'outside'));
    await fs.promises.writeFile(path.join(workDir, 'outside', 'hidden.mdx'), 'ALSO SECRET');
    // Escapes the root: a symlinked file and a symlinked folder.
    await fs.promises.symlink(path.join(workDir, 'secret.mdx'), path.join(rootDir, 'leak.mdx'));
    await fs.promises.symlink(path.join(workDir, 'outside'), path.join(rootDir, 'linked'));
    // Stays inside the root.
    await fs.promises.symlink(
      path.join(rootDir, 'guide', 'page.mdx'),
      path.join(rootDir, 'alias.mdx')
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.promises.rm(workDir, { recursive: true, force: true });
  });

  test('THEN only files that resolve inside the root are published', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pages = await firstValueFrom(
      LocalFolderSource.create({ rootDir, prefixDir: 'mosaic', extensions: ['.mdx'] }, {
        serialiser
      } as never)
    );

    const contents = pages.map(page => (page as { content: string }).content);
    expect(contents).toContain('# Page');
    expect(contents).not.toContain('TOP SECRET');
    expect(contents).not.toContain('ALSO SECRET');
    expect(pages.map(page => page.fullPath).sort()).toEqual([
      '/mosaic/alias.mdx',
      '/mosaic/guide/page.mdx'
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
