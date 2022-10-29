import { IUnionFs, Union } from 'unionfs';
import { IFS } from 'unionfs/lib/fs';
import merge from 'lodash/merge';

import type { IVolumeMutable } from '@jpmorganchase/mosaic-types/dist/Volume';

import FileAccess from './FileAccess';

export default class UnionFileAccess extends FileAccess {
  #ufs: IUnionFs & { fss: IVolumeMutable[] };

  constructor(ufs) {
    super(ufs);
    this.#ufs = ufs;
  }
  // We have to override this here, so we can hand-hold the glob and make sure it fires on all filesystems
  async glob(pattern, options) {
    return this.#ufs.fss.reduce(
      async (globResults, childFs) => [
        ...(await globResults),
        ...(await childFs.promises.glob(pattern, options))
      ],
      Promise.resolve([])
    );
  }
  /**
   * Scopes a filesystem to specific namespaces
   * @param {string[]} namespaces Array of namespaces to limit this filesystem to
   * @returns A new immutable union filesystem
   */
  scope(namespaces: string[]) {
    const scopedUnion: IUnionFs & { fss: IVolumeMutable[] } = new Union() as IUnionFs & {
      fss: IVolumeMutable[];
    };
    const matchingNamespaceFSs = this.#ufs.fss.filter(fss => namespaces.includes(fss.namespace));

    if (!matchingNamespaceFSs.length) {
      throw new Error(
        `Scoping failed. No matching filesystems for ${namespaces
          .map(namespace => `"${namespace}"`)
          .join(', ')}.`
      );
    }
    matchingNamespaceFSs.forEach(fss => scopedUnion.use(fss as unknown as IFS));
    return new UnionFileAccess(scopedUnion);
  }
  /**
   * Reads 1 or more files (if multiple files exist at the same location within the union filesystem)
   * @param file Path
   * @param options.includeConflicts If multiple files exist at the same location in the filesystem, return them all as an array
   * @returns Promise<TDataOut[]>
   */
  readFile(file, options?: { includeConflicts?: boolean }) {
    if (!options?.includeConflicts) {
      return super.readFile(file);
    }
    return this.#ufs.fss.reduce(
      async (fileResults, childFs) => [
        ...(await fileResults),
        ...((await childFs.promises.exists(file)) ? [await childFs.promises.readFile(file)] : [])
      ],
      Promise.resolve([])
    );
  }
  symlinksToJSON() {
    return this.#ufs.fss.reduce(
      (merged, filesystem) => merge(merged, filesystem.symlinksToJSON()),
      {}
    );
  }
  toJSON() {
    return this.#ufs.fss.reduce(
      (merged, filesystem) => ({ ...merged, ...filesystem.toJSON() }),
      {}
    );
  }
}
