import { create } from 'lodash-es';
import { TDataOut } from 'memfs';
import type { IUnionVolume } from '@jpmorganchase/mosaic-types';

import type UnionFileAccess from './UnionFileAccess.js';
import MutableVolume from './MutableVolume.js';

export default class UnionVolume extends MutableVolume implements IUnionVolume {
  #vfs: UnionFileAccess;

  constructor(vfs, namespace) {
    super(vfs, namespace);
    this.#vfs = vfs;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore */
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
