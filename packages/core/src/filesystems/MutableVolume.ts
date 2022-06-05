import type { DirectoryJSON } from 'memfs/lib/volume';
import type { IVolumeMutable } from '@pull-docs/types/dist/Volume';

import type FileAccess from '@pull-docs/types/dist/FileAccess';
import FileSystemRestricted from './RestrictedVolume';

export default class MutableVolume extends FileSystemRestricted implements IVolumeMutable {
  #vfs: FileAccess;

  constructor(vfs) {
    super(vfs);
    this.#vfs = vfs;
  }

  asRestricted() {
    return new FileSystemRestricted(this.#vfs);
  }

  seal() {
    this.#vfs.$$seal();
  }

  clearCache() {
    this.#vfs.$$clearCache();
  }

  unseal() {
    this.#vfs.$$unseal();
  }

  addReadFileHook(hook) {
    this.#vfs.$$addReadFileHook(hook);
  }

  symlinksToJSON(): { [key: string]: { target: string; type: string }[] } {
    return this.#vfs.symlinksToJSON();
  }

  async symlinksFromJSON(json: { [key: string]: { target: string; type: string }[] }) {
    return await this.#vfs.$$symlinksFromJSON(json);
  }

  fromJSON(json: DirectoryJSON) {
    return this.#vfs.fromJSON(json);
  }

  reset() {
    this.#vfs.$$reset();
  }
}
