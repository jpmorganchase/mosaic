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
import type Page from './Page';
import type { Options, Pattern, Entry } from 'fast-glob';

export default interface FileAccess {
  glob(pattern: Pattern, options?: Options): Promise<string[] | Entry[]>;
  mkdir(dir: PathLike, options?: TMode | IMkdirOptions): Promise<void>;
  readdir(dir: PathLike, options?: string | IReaddirOptions): Promise<TDataOut[] | Dirent[]>;
  readFile(file: PathLike): Promise<TDataOut>;
  realpath(target, options?: string | IRealpathOptions): Promise<TDataOut>;
  stat(file: PathLike, options?: IStatOptions): Promise<Stats<TStatNumber>>;
  unlink(target: PathLike): Promise<void>;
  symlink(target: PathLike, alias: PathLike, type?: symlink.Type): Promise<void>;
  writeFile(file: PathLike, data: TData): Promise<void>;
  toJSON(): DirectoryJSON;
  fromJSON(json: DirectoryJSON): void;
  exists(file: PathLike): Promise<boolean>;
  $$reset(): void;
  $$seal(): void;
  get $$sealed(): boolean;
  $$unseal(): void;
  $$clearCache(): void;
  $$symlinksFromJSON(page: { [key: string]: { target: string; type: string }[] }): Promise<void>;
  symlinksToJSON(): { [key: string]: { target: string; type: string }[] };
  $$addReadFileHook(hook: (result: Page, filepath: PathLike) => Promise<Page>): void;
}
