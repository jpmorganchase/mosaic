import type IFileAccess from '@pull-docs/types/dist/IFileAccess';
import type { IVolumePartiallyMutable } from '@pull-docs/types/dist/Volume';

import ImmutableFileSystem from './ImmutableVolume';
import { create } from 'lodash';

class RestrictedVolume extends ImmutableFileSystem implements IVolumePartiallyMutable {
  #vfs: IFileAccess;

  constructor(vfs, namespace) {
    super(vfs, namespace);
    this.#vfs = vfs;
  }

  promises = create(this.promises, {
    unlink: target => {
      return this.#vfs.unlink(target);
    },
    symlink: (target, alias, type) => {
      return this.#vfs.symlink(target, alias, type);
    },
    writeFile: (file, data) => {
      return this.#vfs.writeFile(file, data);
    },
    mkdir: (dir, options) => {
      return this.#vfs.mkdir(dir, options);
    }
  });

  symlinksToJSON(): { [key: string]: { target: string; type: string }[] } {
    return this.#vfs.symlinksToJSON();
  }

  toJSON() {
    return this.#vfs.toJSON();
  }

  get frozen() {
    return this.#vfs.$$frozen;
  }

  asReadOnly() {
    return new ImmutableFileSystem(this.#vfs, super.namespace);
  }
}

export default RestrictedVolume;
