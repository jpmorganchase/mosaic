import type { IFileAccess, IVolumeImmutable } from '@jpmorganchase/mosaic-types';

export default class ImmutableVolume implements IVolumeImmutable {
  #vfs: IFileAccess;
  namespace: string;

  constructor(vfs, namespace) {
    this.#vfs = vfs;
    this.namespace = namespace;
  }

  promises: IVolumeImmutable['promises'] = {
    readFile: file => this.#vfs.readFile(file),
    readdir: (dir, options) => this.#vfs.readdir(dir, options),
    stat: (file, options) => this.#vfs.stat(file, options),
    realpath: (target, options) => this.#vfs.realpath(target, options),
    exists: file => this.#vfs.exists(file),
    glob: (pattern, options) => this.#vfs.glob(pattern, options)
  };

  get frozen() {
    return this.#vfs.$$frozen;
  }

  symlinksToJSON(): { [key: string]: { target: string; type: string }[] } {
    return this.#vfs.symlinksToJSON();
  }

  toJSON() {
    return this.#vfs.toJSON();
  }
}
