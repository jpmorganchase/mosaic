import type FileAccess from '@pull-docs/types/dist/FileAccess';
import type Parser from '@pull-docs/types/dist/Parser';
import type { IVolumePartiallyMutable } from '@pull-docs/types/dist/Volume';

import ImmutableFileSystem from './ImmutableVolume';
import { create } from 'lodash';

class RestrictedVolume extends ImmutableFileSystem implements IVolumePartiallyMutable {
  #vfs: FileAccess;

  constructor(vfs) {
    super(vfs);
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

  get sealed() {
    return this.#vfs.$$sealed;
  }

  asReadOnly() {
    return new ImmutableFileSystem(this.#vfs);
  }
}

export default RestrictedVolume;
