import matter from 'gray-matter';
import type { TDataOut } from 'memfs/lib/encoding';
import type Serialiser from '@pull-docs/types/dist/Serialiser';

const Serialisers: Serialiser = {
  async serialise(route, { content = '', ...meta }) {
    return Buffer.from(matter.stringify(content, meta));
  },

  async deserialise(route, rawData: TDataOut) {
    const { data, content } = matter(rawData) as any;
    return {
      ...data,
      content
    };
  }
};

export default Serialisers;
