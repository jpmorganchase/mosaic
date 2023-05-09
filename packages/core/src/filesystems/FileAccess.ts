import path from 'node:path';
import glob from 'fast-glob';
import { PathLike } from 'node:fs';
import { createFsFromVolume, DirectoryJSON, IRealpathOptions, _Volume, TDataOut } from 'memfs';

import type { IFileAccess } from '@jpmorganchase/mosaic-types';

export default class FileAccess implements IFileAccess {
  #adapter: _Volume;
  #hooks: ((filepath: PathLike, fileData: TDataOut) => Promise<TDataOut>)[] = [];
  #rawReadonlyFs;
  #symlinks: { [key: string]: { target: string; type: string }[] } = {};
  #frozen = false;
  #cachedPages = new Map();

  constructor(filesystemAdapter: _Volume) {
    this.#adapter = filesystemAdapter;
  }

  async readFile(file) {
    const resolvedPath = await this.#resolvePath(file);
    let result;
    try {
      result = await this.#getFileFromCache(resolvedPath);
    } catch (e) {
      throw new Error(e);
    }
    return result;
    // return this.#adapter.promises.readFile(resolvedPath);
  }

  async glob(pattern, options) {
    // We need a created filesystem, not a Volume, for glob
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.#rawReadonlyFs = this.#rawReadonlyFs || createFsFromVolume(this.#adapter as any);
    const paths = Array.from(
      new Set(
        await Promise.all(
          (
            await glob(pattern, {
              ...options,
              absolute: true,
              fs: this.#rawReadonlyFs
            })
          ).map(filepath => this.#resolvePath(filepath))
        )
      )
    );

    return paths;
  }

  $$addReadFileHook(hook) {
    // if (this.#frozen) {
    //   throw new Error('This file system has been frozen. Mutations are not allowed.');
    // }
    this.#hooks.push(hook);
  }

  readdir(dir, options) {
    return this.#adapter.promises.readdir(dir, options);
  }

  async stat(file, options) {
    return this.#adapter.promises.stat(file, options);
  }

  get $$frozen(): boolean {
    return this.#frozen;
  }

  realpath(target, options?: string | IRealpathOptions) {
    return this.#adapter.promises.realpath(target, options);
  }

  async $$symlinksFromJSON(symlinks) {
    this.#symlinks = symlinks;
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    Object.keys(symlinks).forEach(async alias => {
      for (const { target, type = 'file' } of symlinks[alias]) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await this.exists(alias))) {
          // eslint-disable-next-line no-await-in-loop
          if (!(await this.exists(path.dirname(alias)))) {
            // TODO: This works... But why are the subdirs not being passed from the child process as `null`s?
            // eslint-disable-next-line no-await-in-loop
            await this.#adapter.promises.mkdir(path.dirname(alias), { recursive: true });
          }
          // eslint-disable-next-line no-await-in-loop
          await this.#adapter.promises.symlink(target, alias, type);
        }
      }
    });
  }

  async unlink(target) {
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    await this.#adapter.promises.unlink(target);
    // If path refers to a symbolic link, then the link is removed without affecting the file or directory to which that link refers.
    this.#cachedPages.delete(target);
  }

  symlink(target, alias, type) {
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    this.#symlinks[alias] = this.#symlinks[alias] || [];
    this.#symlinks[alias].push({ target, type });
    // console.debug('[Mosaic]', target, 'aliased to', alias);
    return this.#adapter.promises.symlink(target, alias, type);
  }

  async writeFile(file, data) {
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    await this.#adapter.promises.writeFile(file, data);

    this.#cachedPages.delete(file);
    // TODO: Do we need?
    this.#cachedPages.delete(await this.#resolvePath(file));
  }

  async mkdir(dir, options) {
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    return this.#adapter.promises.mkdir(dir, options);
  }

  async exists(file) {
    try {
      return !!(await this.#adapter.promises.realpath(file));
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
    return false;
  }

  toJSON() {
    return this.#adapter.toJSON();
  }

  symlinksToJSON() {
    return this.#symlinks;
  }

  async #resolvePath(file) {
    const realPath = await this.#adapter.promises.realpath(file);

    if (
      realPath !== file &&
      !(await this.#adapter.promises.stat(realPath, { throwIfNoEntry: true }))
    ) {
      throw new Error(`ENOENT: no such file or directory, stat '${file}'`);
    }

    const stat = await this.#adapter.promises.stat(realPath, { throwIfNoEntry: true });
    // Enable this for /index directories ... but should a filesystem really rewrite URLs like that?
    // The downside is that relative links can break when /index is missing from the end of a URL
    // e.g. if /home/dir is actually /home/dir/index any relative links will be from ./home not ./home/dir
    // if (stat.isDirectory()) {
    //   try {
    //     const resolved = await this.#resolvePath(path.join(String(realPath), 'index'));

    //     return resolved;
    //   } catch {}
    // }
    if (!stat.isFile()) {
      return this.#normalizePath(file);
      // throw new Error(`EISDIR: illegal operation on a directory, open '${file}'`);
    }
    return this.#normalizePath(String(realPath));
  }

  /**
   ** This is a bit of a hack to get around a bug in fast-glob where when onlyDirectories is true the Drive letter is included in the path.
   **/
  #normalizePath = (file: string) => {
    const root = path.parse(file).root;
    return path.posix.normalize(file).replace(root, '/');
  };

  async #getFileFromCache(file) {
    const stat = await this.#adapter.promises.stat(file, { throwIfNoEntry: true });

    if (!stat.isFile()) {
      return null;
    }

    if (await this.#isNonHiddenPageCached(file)) {
      const cachedItem = this.#cachedPages.get(file);
      return cachedItem;
    }

    // Bit of parallel programming needed here, to avoid 2+ requests triggering a file load at the same time and making a race condition
    // eslint-disable-next-line no-async-promise-executor
    const loadPagePromise = new Promise(async resolve => {
      const rawFile = await this.#adapter.promises.readFile(file);

      // if (!this.#pageTest(file)) {
      //   return resolve(rawFile);
      // }
      let fileData = rawFile;

      for (const hook of this.#hooks) {
        // eslint-disable-next-line no-await-in-loop
        fileData = await hook(file, fileData);
      }
      resolve(fileData);
    });

    this.#cachedPages.set(file, loadPagePromise);

    const result = await loadPagePromise;

    if (this.#frozen) {
      this.#cachedPages.set(file, result);
    } else {
      // Clear the `currentlyResolving` entry
      this.#cachedPages.delete(file);
    }

    return result;

    // this.#cachedPages.add(file);
    // return this.#adapter.promises.writeFile(file, JSON.stringify(currentPage));
  }

  async #isNonHiddenPageCached(fileArg) {
    const file = await this.#adapter.promises.realpath(fileArg);

    return this.#cachedPages.has(file);
  }

  $$freeze() {
    if (this.#frozen) {
      throw new Error('This file system has already been frozen.');
    }
    this.#frozen = true;
  }

  $$unfreeze() {
    if (!this.#frozen) {
      throw new Error('This file system is not frozen.');
    }
    this.#frozen = false;
  }

  $$clearCache() {
    this.#cachedPages.clear();
  }

  async $$reset() {
    this.#rawReadonlyFs = null;
    this.#frozen = false;
    this.#symlinks = {};
    this.#hooks = [];
    this.#adapter.reset();
    this.#cachedPages.clear();
  }

  fromJSON(json: DirectoryJSON) {
    if (this.#frozen) {
      throw new Error('This file system has been frozen. Mutations are not allowed.');
    }
    this.#adapter.fromJSON(json);
  }
}
