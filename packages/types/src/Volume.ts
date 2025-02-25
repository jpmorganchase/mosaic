import type { DirectoryJSON, IFs } from 'memfs';
import type { PathLike } from 'fs';
import type { Options, Pattern, Entry } from 'fast-glob';

type TDataOut = string | Buffer;

export type { TDataOut };

/**
 * Volumes are lightweight decorators which wrap `FileAccess` and limit access to the underlying API for different use-cases
 * Examples include disallowing mutation or allowing underlying functions like resetting
 */
export interface IVolume {
  namespace: string;
  reset?(): void;
  toJSON(): DirectoryJSON;
  symlinksToJSON(): { [key: string]: { target: string; type: string }[] };
  fromJSON?(json: DirectoryJSON): void;
  promises: Pick<
    IFs['promises'],
    'mkdir' | 'readdir' | 'readFile' | 'realpath' | 'stat' | 'symlink' | 'unlink' | 'writeFile'
  > & {
    exists(file: PathLike): Promise<boolean>;
    glob(pattern: Pattern, options?: Options): Promise<string[] | Entry[]>;
  };
}
export interface IVolumePartiallyMutable extends Omit<IVolume, 'reset' | 'fromJSON'> {
  /**
   * Functions that will be called after a page is read from the filesystem for the first time (since last cache clear).
   * The value returned from this hook will *replace* the contents of the read file.
   * @param hook Any function that invokes an `afterRead` plugin
   * @returns Promise<Page>
   */
  __internal_do_not_use_addReadFileHook(
    hook: (filepath: PathLike, fileData: TDataOut) => Promise<TDataOut>
  ): void;
}

export interface IUnionVolume extends Omit<IVolumeImmutable, 'promises'> {
  promises: Omit<IVolumeImmutable['promises'], 'readFile'> & {
    /**
     * Reads a file
     * @param file Path
     * @returns Promise<TDataOut>
     */
    readFile(file: PathLike): Promise<TDataOut>;
    readFile(file: PathLike, options?: { includeConflicts?: false }): Promise<TDataOut>;
    /**
     * Reads 1 or more files (if multiple files exist at the same location within the union filesystem)
     * @param file Path
     * @param options.includeConflicts If multiple files exist at the same location in the filesystem, return them all as an array
     * @returns Promise<TDataOut[]>
     */
    readFile(file: PathLike, options: { includeConflicts: true }): Promise<TDataOut[]>;
  };
  /**
   * Scopes a filesystem to specific namespaces
   * @param {string[]} namespaces Array of namespaces to limit this filesystem to
   * @returns A new immutable union filesystem
   */
  scope(namespaces: string[]): IUnionVolume;
}

export interface IVolumeMutable extends IVolume {
  /**
   * Functions that will be called after a page is read from the filesystem for the first time (since last cache clear).
   * The value returned from this hook will *replace* the contents of the read file.
   * @param hook Any function that invokes an `afterRead` plugin
   * @returns Promise<Page>
   */
  __internal_do_not_use_addReadFileHook(
    hook: (filepath: PathLike, fileData: TDataOut) => Promise<TDataOut>
  ): void;
  /**
   * Restricted filesystems can be written to, but cannot be frozen, updated or reset
   */
  asRestricted(): IVolumePartiallyMutable;
  /**
   * ReadOnly filesystems cannot be mutated in any way, including freezing, updating or reseting
   */
  asReadOnly(): IVolumeImmutable;
  /**
   * Clears the filesystem's internal page cache - used when the cache may be outdated due to a source emiting new data or a dependency changing.
   */
  clearCache(): void;
  /**
   * Re-enables mutations on the underlying `FileAccess`.
   */
  unfreeze(): void;
  /**
   * Freezes an object, preventing all mutations on the underlying `FileAccess` object
   * Freezing a filesystem indicates that the mutation period has ended and the file system can no longer be modified.
   * When a filesystem is unfrozen, it is considered to be in flux, so may change as more plugins are called.
   * When a filesystem is frozen, it is considered to be stable and ready to begin serving finalised versions of files.
   */
  freeze(): void;
  /**
   * Is this filesystem frozen/mutable?
   * @returns {boolean}
   */
  readonly frozen: boolean;
  /**
   * Appends content to the filesystem
   * @param json A JSON blob in the form of {[fullPath]: "{fullPath: '', content: ''}"}
   */
  fromJSON(json: DirectoryJSON): void;
  symlinksFromJSON(json: { [key: string]: { target: string; type: string }[] }): Promise<void>;
  /**
   * Completely resets the filesystem.
   * This includes clearing page cache, erasing filesystem data, clearing symlinks etc
   */
  reset(): void;
}
export interface IVolumeImmutable
  extends Omit<
    IVolumePartiallyMutable,
    'fromJSON' | 'reset' | 'promises' | '__internal_do_not_use_addReadFileHook'
  > {
  promises: Omit<
    IVolume['promises'],
    'writeFile' | 'symlink' | 'mkdir' | 'unlink' | 'rmdir' | 'rm' | 'rename'
  >;
}
