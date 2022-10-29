import { create } from 'lodash';
import type IFileAccess from '@jpmorganchase/mosaic-types/dist/IFileAccess';
import type { IVolumePartiallyMutable } from '@jpmorganchase/mosaic-types/dist/Volume';

import ImmutableFileSystem from './ImmutableVolume';

/**
 * Restricted filesystems can be written to, but cannot be frozen, updated or reset
 */
class RestrictedVolume extends ImmutableFileSystem implements IVolumePartiallyMutable {
  #vfs: IFileAccess;

  constructor(vfs, namespace) {
    super(vfs, namespace);
    this.#vfs = vfs;
  }

  promises = create(this.promises, {
    unlink: target => this.#vfs.unlink(target),
    symlink: (target, alias, type) => this.#vfs.symlink(target, alias, type),
    writeFile: (file, data) => this.#vfs.writeFile(file, data),
    mkdir: (dir, options) => this.#vfs.mkdir(dir, options)
  });

  /**
   * Do not use this method on restricted volumes, as it may disrupt the read/cache flow of files.
   */
  __internal_do_not_use_addReadFileHook(readFileHook) {
    return this.#vfs.$$addReadFileHook(readFileHook);
  }

  symlinksToJSON(): { [key: string]: { target: string; type: string }[] } {
    return this.#vfs.symlinksToJSON();
  }

  toJSON() {
    return this.#vfs.toJSON();
  }

  get frozen(): boolean {
    return this.#vfs.$$frozen;
  }

  asReadOnly() {
    return new ImmutableFileSystem(this.#vfs, super.namespace);
  }
}

export default RestrictedVolume;
