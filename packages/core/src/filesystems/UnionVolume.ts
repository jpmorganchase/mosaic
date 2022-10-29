import { create } from 'lodash';
import { TDataOut } from 'memfs/lib/encoding';
import type { IUnionVolume } from '@jpmorganchase/mosaic-types/dist/Volume';

import type UnionFileAccess from './UnionFileAccess';
import MutableVolume from './MutableVolume';

export default class UnionVolume extends MutableVolume implements IUnionVolume {
  #vfs: UnionFileAccess;

  constructor(vfs, namespace) {
    super(vfs, namespace);
    this.#vfs = vfs;
  }

  promises = create(this.promises, {
    readFile: (file, options) => {
      if (options?.includeConflicts) {
        return this.#vfs.readFile(file, options) as Promise<TDataOut[]>;
      }
      return this.#vfs.readFile(file) as Promise<TDataOut>;
    }
  });

  scope(namespaces: string[]) {
    return new UnionVolume(this.#vfs.scope(namespaces), super.namespace);
  }
}
