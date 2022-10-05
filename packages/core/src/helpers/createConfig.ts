import type MutableData from '@jpmorganchase/mosaic-types/dist/MutableData';
import { ImmutableData } from '@jpmorganchase/mosaic-types/dist/MutableData';
import { merge } from 'lodash';
import path from 'path';

export default function createConfig<T = {}>(initialData: Partial<T> = {}): MutableData<T> {
  let data: { refs?: {}; globalRefs?: {}; aliases?: {} } = { refs: {}, globalRefs: {}, aliases: {}, ...initialData };

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
