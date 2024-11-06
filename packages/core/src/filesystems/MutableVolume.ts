import type { DirectoryJSON } from 'memfs';

import type { IFileAccess, IVolumeMutable } from '@jpmorganchase/mosaic-types';

import FileSystemRestricted from './RestrictedVolume.js';

export default class MutableVolume extends FileSystemRestricted implements IVolumeMutable {
  #vfs: IFileAccess;

  constructor(vfs, namespace) {
    super(vfs, namespace);
    this.#vfs = vfs;
  }

  asRestricted() {
    return new FileSystemRestricted(this.#vfs, this.namespace);
  }

  freeze() {
    this.#vfs.$$freeze();
  }

  clearCache() {
    this.#vfs.$$clearCache();
  }

  unfreeze() {
    this.#vfs.$$unfreeze();
  }

  __internal_do_not_use_addReadFileHook(hook) {
    this.#vfs.$$addReadFileHook(hook);
  }

  symlinksToJSON(): { [key: string]: { target: string; type: string }[] } {
    return this.#vfs.symlinksToJSON();
  }

  async symlinksFromJSON(json: { [key: string]: { target: string; type: string }[] }) {
    let result;
    try {
      result = await this.#vfs.$$symlinksFromJSON(json);
    } catch (e) {
      throw new Error(e);
    }
    return result;
  }

  fromJSON(json: DirectoryJSON) {
    return this.#vfs.fromJSON(json);
  }

  reset() {
    this.#vfs.$$reset();
  }
}
