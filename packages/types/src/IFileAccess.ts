import type { Options, Pattern, Entry } from 'fast-glob';
import type { DirectoryJSON, IFs } from 'memfs';
import type { PathLike } from 'fs';
import type { Page } from './Page.js';

/**
 * This is the core underlying filesystem, which directly interfaces with a memfs Volume to mutate the filesystem
 */
export interface IFileAccess
  extends Pick<
    IFs['promises'],
    'mkdir' | 'readdir' | 'readFile' | 'realpath' | 'stat' | 'unlink' | 'symlink' | 'writeFile'
  > {
  glob(pattern: Pattern, options?: Omit<Options, 'absolute' | 'fs'>): Promise<string[] | Entry[]>;
  toJSON(): DirectoryJSON;
  fromJSON(json: DirectoryJSON): void;
  exists(file: PathLike): Promise<boolean>;
  $$reset(): void;
  $$freeze(): void;
  readonly $$frozen: boolean;
  $$unfreeze(): void;
  $$clearCache(): void;
  $$symlinksFromJSON(page: { [key: string]: { target: string; type: string }[] }): Promise<void>;
  symlinksToJSON(): { [key: string]: { target: string; type: string }[] };
  $$addReadFileHook(hook: (result: Page, filepath: PathLike) => Promise<Page>): void;
}
