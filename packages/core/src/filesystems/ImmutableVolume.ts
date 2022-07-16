import type { IVolumeImmutable } from '@pull-docs/types/dist/Volume';
import type FileAccess from '@pull-docs/types/dist/FileAccess';

export default class ImmutableVolume implements IVolumeImmutable {
  #vfs: FileAccess;
  
  constructor(vfs) {
    this.#vfs = vfs;
  }

  promises: IVolumeImmutable['promises'] = {
    readFile: file => {
      return this.#vfs.readFile(file);
    },
    readdir: (dir, options) => {
      return this.#vfs.readdir(dir, options);
    },
    stat: (file, options) => {
      return this.#vfs.stat(file, options);
    },
    realpath: (target, options) => {
      return this.#vfs.realpath(target, options);
    },
    exists: file => {
      return this.#vfs.exists(file);
    },
    glob: (pattern, options) => {
      return this.#vfs.glob(pattern, options);
    }
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
