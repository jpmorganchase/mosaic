import type MutableData from '@pull-docs/types/dist/MutableData';
import { ImmutableData } from '@pull-docs/types/dist/MutableData';
import { merge } from 'lodash';

export default function createConfig<T = {}>(initialData: Partial<T> = {}): MutableData<T> {
  let data = { refs: {}, aliases: {}, ...initialData };

  const configReadOnly = {
    get data() {
      return Object.freeze({ ...data });
    }
  } as ImmutableData<T>;

  return {
    asReadOnly() {
      return configReadOnly;
    },
    setRef(targetPath, targetPropPath, refValue) {
      data.refs[targetPath] = data.refs[targetPath] || [];
      data.refs[targetPath].push({
        $$path: targetPropPath,
        $$value: refValue
      });
    },
    setAliases(route: string, aliases: string[]) {
      data.aliases[route] = new Set<string>(
        data.aliases[route] || []
      );
      aliases.forEach(alias => data.aliases[route].add(alias));
    },
    setData(value) {
      merge(data, value);
    },
    get data() {
      return configReadOnly.data;
    }
  };
}
