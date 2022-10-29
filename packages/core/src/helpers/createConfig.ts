import type MutableData from '@jpmorganchase/mosaic-types/dist/MutableData';
import { ImmutableData } from '@jpmorganchase/mosaic-types/dist/MutableData';
import { merge } from 'lodash';
import path from 'path';

export interface Aliases {
  [key: string]: Set<string>;
}
export interface FSRef {
  $$path?: string | string[];
  $$value?: string;
}
export interface GlobalRefs {
  [key: string]: FSRef;
}
export interface ScopedRefs {
  [key: string]: FSRef;
}

export interface FSConfig {
  refs?: ScopedRefs | [];
  globalRefs?: GlobalRefs | [];
  aliases?: Aliases | [];
}

export default function createConfig<T = FSConfig>(initialData?: Partial<T>): MutableData<T> {
  let data: {
    refs?: ScopedRefs | [];
    globalRefs?: GlobalRefs | [];
    aliases?: Aliases | [];
  } = {
    refs: {},
    globalRefs: {},
    aliases: {},
    ...initialData
  };

  const configReadOnly = {
    get data() {
      return Object.freeze({ ...data });
    }
  } as ImmutableData<T>;

  return {
    asReadOnly() {
      return configReadOnly;
    },
    setTags(fullPath: string, tags: string[]) {
      data.aliases[fullPath] = new Set<string>(data.aliases[fullPath] || []);
      tags.forEach(tag => data.aliases[fullPath].add(path.join('/.tags', tag, fullPath)));
    },
    setGlobalRef(targetPath, targetPropPath, refValue) {
      data.globalRefs[targetPath] = data.globalRefs[targetPath] || [];
      data.globalRefs[targetPath].push({
        $$path: targetPropPath,
        $$value: refValue
      });
    },
    setRef(targetPath, targetPropPath, refValue) {
      data.refs[targetPath] = data.refs[targetPath] || [];
      data.refs[targetPath].push({
        $$path: targetPropPath,
        $$value: refValue
      });
    },
    setAliases(fullPath: string, aliases: string[]) {
      data.aliases[fullPath] = new Set<string>(data.aliases[fullPath] || []);
      aliases.forEach(alias => data.aliases[fullPath].add(alias));
    },
    setData(value, overwrite = false) {
      if (overwrite) {
        data = value;
      } else {
        merge(data, value);
      }
    },
    get data() {
      return configReadOnly.data;
    }
  };
}
