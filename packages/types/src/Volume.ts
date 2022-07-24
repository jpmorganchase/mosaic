import type {
  DirectoryJSON,
  IRealpathOptions,
  IMkdirOptions,
  IReaddirOptions,
  TData,
  TMode
} from 'memfs/lib/volume';
import type { TDataOut } from 'memfs/lib/encoding';
import type Dirent from 'memfs/lib/Dirent';
import type Stats from 'memfs/lib/Stats';
import type { TStatNumber } from 'memfs/lib/Stats';
import type { IStatOptions } from 'memfs/lib/volume';
import type { PathLike, symlink } from 'fs';
import type { Options, Pattern, Entry } from 'fast-glob';

import type Page from './Page';

/**
 * Volumes are lightweight decorators which wrap `FileAccess` and limit access to the underlying API for different use-cases
 * Examples include disallowing mutation or allowing underlying functions like resetting
 */
interface IVolume {
  namespace: string;
  reset?(): void;
  toJSON(): DirectoryJSON;
  symlinksToJSON(): { [key: string]: { target: string; type: string }[] };
  fromJSON?(json: DirectoryJSON): void;
  promises: {
    exists(file: PathLike): Promise<boolean>;
    glob(pattern: Pattern, options?: Options): Promise<string[] | Entry[]>;
    mkdir(dir: PathLike, options?: TMode | IMkdirOptions): Promise<void>;
    readdir(dir: PathLike, options?: string | IReaddirOptions): Promise<TDataOut[] | Dirent[]>;
    readFile(file: PathLike): Promise<TDataOut>;
    realpath(target, options?: string | IRealpathOptions): Promise<TDataOut>;
    stat(file: PathLike, options?: IStatOptions): Promise<Stats<TStatNumber>>;
    symlink(target: PathLike, alias: PathLike, type?: symlink.Type): Promise<void>;
    unlink(target: PathLike): Promise<void>;
    writeFile(file: PathLike, data: TData): Promise<void>;
  };
}
export interface IVolumePartiallyMutable extends Omit<IVolume, 'reset' | 'fromJSON'> {
  /**
   * Functions that will be called after a page is read from the filesystem for the first time (since last cache clear).
   * The value returned from this hook will *replace* the contents of the read file.
   * @param hook Any function that invokes an `afterRead` plugin
   * @returns Promise<Page>
   */
  __internal_do_not_use_addReadFileHook(hook: (filepath: PathLike, fileData: TDataOut) => Promise<TDataOut>): void;
}

export interface IUnionVolume extends Omit<IVolumeImmutable, 'promises'> {
  promises: Pick<IVolumeImmutable, 'promises'> & {
  readFile(file: PathLike): Promise<TDataOut>;
  readFile(file: PathLike, options?: { includeConflicts?: false }): Promise<TDataOut>;
  readFile(file: PathLike, options: { includeConflicts: true }): Promise<TDataOut[]>;
  };
  scope(namespaces: string[]): IUnionVolume;
}

export interface IVolumeMutable extends IVolume {
  /**
   * Functions that will be called after a page is read from the filesystem for the first time (since last cache clear).
   * The value returned from this hook will *replace* the contents of the read file.
   * @param hook Any function that invokes an `afterRead` plugin
   * @returns Promise<Page>
   */
  __internal_do_not_use_addReadFileHook(hook: (filepath: PathLike, fileData: TDataOut) => Promise<TDataOut>): void;
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
  get frozen(): boolean;
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
  extends Omit<IVolumePartiallyMutable, 'fromJSON' | 'reset' | 'promises' | '__internal_do_not_use_addReadFileHook'> {
  promises: Omit<
    IVolume['promises'],
    'writeFile' | 'symlink' | 'mkdir' | 'unlink' | 'rmdir' | 'rm' | 'rename'
  >;
}
